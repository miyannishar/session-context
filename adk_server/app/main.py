"""
FastAPI application exposing a minimal Google ADK agent for the Session Context project.
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.genai.types import Content, Part

from .base_agent import root_agent, runner, session_service
from .labeler import create_labeler_agent
from .schemas import (
    AgentRequest,
    AgentResponse,
    GroupingRequest,
    GroupingResponse,
    LabelRequest,
    LabelResponse,
)

logger = logging.getLogger("session-context-adk")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(logging.INFO)
logger.propagate = False


def summarize_event(event: Any) -> Dict[str, Any]:
    """Create a log-friendly summary of an ADK event."""
    summary: Dict[str, Any] = {"type": event.__class__.__name__}

    for attr in ("status", "tool", "role"):
        value = getattr(event, attr, None)
        if value:
            summary[attr] = value

    content = getattr(event, "content", None)
    if content and getattr(content, "parts", None):
        parts_summary = []
        for part in content.parts:  # type: ignore[attr-defined]
            part_info: Dict[str, Any] = {}
            text = getattr(part, "text", None)
            if text:
                part_info["text"] = text[:200]

            function_call = getattr(part, "function_call", None)
            if function_call:
                part_info["function_call"] = getattr(function_call, "name", None) or "anonymous"

            function_response = getattr(part, "function_response", None)
            if function_response and getattr(function_response, "response", None):
                response_payload = function_response.response
                if isinstance(response_payload, (dict, list, str, int, float, bool)) or response_payload is None:
                    part_info["function_response"] = response_payload
                else:
                    part_info["function_response"] = str(response_payload)

            if part_info:
                parts_summary.append(part_info)

        if parts_summary:
            summary["parts"] = parts_summary

    return summary


def log_adk_event(endpoint_label: str, event: Any) -> None:
    """Log an ADK event with structured detail."""
    try:
        summary = summarize_event(event)
        logger.info(
            "%s ADK event: %s",
            endpoint_label,
            json.dumps(summary, ensure_ascii=False, default=str),
        )
    except Exception as exc:  # pragma: no cover
        logger.warning("%s ADK event logging failed: %s", endpoint_label, exc)


DEFAULT_USER_ID = os.getenv("SESSION_CONTEXT_DEFAULT_USER_ID", "session-context")
ALLOW_ORIGINS = [origin.strip() for origin in os.getenv("SESSION_CONTEXT_ALLOW_ORIGINS", "*").split(",") if origin.strip()]
if not ALLOW_ORIGINS:
    ALLOW_ORIGINS = ["*"]

AGENT_NAME = root_agent.name
RUNNER_APP_NAME = runner.app_name

app = FastAPI(
    title="Session Context ADK Backend",
    description="Lightweight FastAPI service that bridges the Chrome extension with a Google ADK agent.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def ensure_session(user_id: str, session_id: str) -> None:
    session = await session_service.get_session(app_name=RUNNER_APP_NAME, user_id=user_id, session_id=session_id)
    if not session:
        await session_service.create_session(
            app_name=RUNNER_APP_NAME,
            user_id=user_id,
            session_id=session_id,
            state=None,
        )


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/label", response_model=LabelResponse)
async def generate_label(request: LabelRequest) -> LabelResponse:
    """
    Label generation endpoint that generates a session label from a list of tabs.
    Matches the Node.js /api/label interface.
    """
    if not request.tabList or len(request.tabList) == 0:
        raise HTTPException(status_code=400, detail="tabList must contain at least one tab")

    user_id = DEFAULT_USER_ID
    # Generate a unique session ID for each request to avoid conversation history buildup
    from uuid import uuid4
    session_id = f"labeling-{uuid4()}"
    tab_titles = [tab.title or "Untitled" for tab in request.tabList[:3]]
    logger.info(
        "Processing /api/label request: tabs=%s, example_titles=%s",
        len(request.tabList),
        tab_titles,
    )

    try:
        await ensure_session(user_id=user_id, session_id=session_id)
    except Exception as exc:
        logger.exception("Failed to ensure session: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to prepare agent session") from exc

    # Format tab list for the labeler agent
    tabs_description = []
    for tab in request.tabList[:10]:  # Limit to 10 tabs for context
        tab_text = f"- {tab.title or 'Untitled'} ({tab.url})"
        if tab.content:
            if tab.content.h1:
                tab_text += f"\n  Heading: {tab.content.h1}"
            if tab.content.metaDescription:
                tab_text += f"\n  Description: {tab.content.metaDescription[:100]}"
        tabs_description.append(tab_text)

    input_message = f"""Generate a label for this browsing session with {len(request.tabList)} tab(s):

{chr(10).join(tabs_description)}

Provide a concise 4-5 word label that captures the session's theme."""

    # Create a temporary labeler agent instance
    labeler_agent = create_labeler_agent()
    
    new_message = Content(role="user", parts=[Part(text=input_message)])

    try:
        # Use the labeler agent directly
        from google.adk import Runner
        from google.adk.sessions import InMemorySessionService
        
        temp_session_service = InMemorySessionService()
        await temp_session_service.create_session(
            app_name="labeler",
            user_id=user_id,
            session_id=session_id,
            state=None,
        )
        
        temp_runner = Runner(agent=labeler_agent, session_service=temp_session_service, app_name="labeler")
        
        events = temp_runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=new_message,
        )

        label_text = ""
        async for event in events:
            log_adk_event("/api/label", event)
            content = getattr(event, "content", None)
            if not content or not getattr(content, "parts", None):
                continue

            for part in content.parts:  # type: ignore[attr-defined]
                text = getattr(part, "text", None)
                if text:
                    label_text = text.strip()
                    break

            if label_text:
                break

        if not label_text:
            raise HTTPException(status_code=502, detail="Unable to generate label")

        # Clean up the label (remove quotes, punctuation)
        label_text = label_text.replace('"', '').replace("'", '').strip()
        if len(label_text) > 50:
            label_text = label_text[:50]

        response = LabelResponse(label=label_text)
        logger.info("Completed /api/label response: label=%s", response.label)
        return response

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Label generation failed: %s", exc)
        raise HTTPException(status_code=500, detail="Unable to generate label") from exc


@app.post("/api/group", response_model=GroupingResponse)
async def group_session(request: GroupingRequest) -> GroupingResponse:
    """
    Session grouping endpoint that matches the Node.js /api/group interface.
    
    Receives current tab + existing sessions and returns merge/new decision.
    """
    user_id = DEFAULT_USER_ID
    # Generate a unique session ID for each request to avoid conversation history buildup
    from uuid import uuid4
    session_id = f"grouping-{uuid4()}"
    existing_labels = [session.label or "Unnamed" for session in request.existingSessions[:3]]
    logger.info(
        "Processing /api/group request: new_tab_title=%s, existing_sessions=%s, current_tabs=%s, example_existing_labels=%s",
        request.newTab.title or "Untitled",
        len(request.existingSessions),
        len(request.currentTabs),
        existing_labels,
    )

    def normalize_url(url: Optional[str]) -> str:
        if not url:
            return ""
        return url.strip().rstrip("/")

    normalized_new_url = normalize_url(request.newTab.url)
    duplicate_session = None
    if normalized_new_url:
        for session in request.existingSessions:
            if any(normalize_url(tab.url) == normalized_new_url for tab in session.tabList):
                duplicate_session = session
                break

    if duplicate_session:
        logger.info(
            "Duplicate tab detected; returning no_action (session_id=%s, url=%s)",
            duplicate_session.id,
            normalized_new_url,
        )
        return GroupingResponse(
            action="no_action",
            sessionId=duplicate_session.id,
            updatedLabel=duplicate_session.label,
            label=duplicate_session.label,
            reason="duplicate_tab_url",
        )

    try:
        await ensure_session(user_id=user_id, session_id=session_id)
    except Exception as exc:
        logger.exception("Failed to ensure session: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to prepare agent session") from exc

    # Format the input as a structured message for the agent
    input_message = f"""Process this tab grouping request:

NEW TAB:
- URL: {request.newTab.url}
- Title: {request.newTab.title or 'Untitled'}
"""
    
    if request.newTab.content:
        if request.newTab.content.h1:
            input_message += f"- Main Heading: {request.newTab.content.h1}\n"
        if request.newTab.content.h2:
            input_message += f"- Sections: {', '.join(request.newTab.content.h2[:3])}\n"
        if request.newTab.content.metaDescription:
            input_message += f"- Description: {request.newTab.content.metaDescription[:150]}\n"

    if request.currentTabs:
        input_message += f"\nCURRENT OPEN TABS ({len(request.currentTabs)}):\n"
        for tab in request.currentTabs[:5]:
            input_message += f"- {tab.title or 'Untitled'} — {tab.url}\n"

    if request.existingSessions:
        input_message += f"\nEXISTING SESSIONS ({len(request.existingSessions)}):\n"
        for idx, session in enumerate(request.existingSessions):
            input_message += f"\nSession {idx + 1} (ID: {session.id}, Label: {session.label or 'Unnamed'}):\n"
            for tab in session.tabList[:3]:
                input_message += f"  - {tab.title or 'Untitled'} — {tab.url}\n"
    else:
        input_message += "\nNo existing sessions.\n"

    input_message += "\nProvide your grouping decision."

    new_message = Content(role="user", parts=[Part(text=input_message)])

    try:
        events = runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=new_message,
        )

        decision_json = None
        async for event in events:
            log_adk_event("/api/group", event)
            content = getattr(event, "content", None)
            if not content or not getattr(content, "parts", None):
                continue

            # Look for structured output from the matcher agent
            for part in content.parts:  # type: ignore[attr-defined]
                function_response = getattr(part, "function_response", None)
                if function_response and getattr(function_response, "response", None):
                    resp = function_response.response
                    if isinstance(resp, dict):
                        # Check if this is the matcher's output
                        if "action" in resp:
                            decision_json = resp
                            break

            if decision_json:
                break

        if not decision_json:
            response = GroupingResponse(
                action="create_new",
                suggestedLabel=None,
                label=None,
                reason="no_structured_response",
            )
            logger.info(
                "Completed /api/group response (fallback): action=create_new, suggested_label=None",
            )
            return response

        # Parse the decision
        action = decision_json.get("action")
        if action == "new":
            action = "create_new"
        if action == "no_action":
            reason = decision_json.get("reason") or "agent_returned_no_action"
            updated_label = decision_json.get("updatedLabel") or decision_json.get("label")
            response = GroupingResponse(
                action="no_action",
                sessionId=decision_json.get("sessionId"),
                updatedLabel=updated_label,
                label=updated_label,
                reason=reason,
            )
            logger.info(
                "Completed /api/group response: action=no_action, session_id=%s, reason=%s",
                response.sessionId,
                response.reason,
            )
            return response
        if action == "merge":
            updated_label = decision_json.get("updatedLabel") or decision_json.get("label")
            response = GroupingResponse(
                action="merge",
                sessionId=decision_json.get("sessionId", ""),
                updatedLabel=updated_label,
                label=updated_label,
                reason=decision_json.get("reason"),
            )
            logger.info(
                "Completed /api/group response: action=merge, session_id=%s, updated_label=%s",
                response.sessionId,
                response.updatedLabel,
            )
            return response
        else:
            suggested_label = decision_json.get("suggestedLabel") or decision_json.get("label")
            response = GroupingResponse(
                action="create_new",
                suggestedLabel=suggested_label,
                label=suggested_label,
                reason=decision_json.get("reason"),
            )
            logger.info(
                "Completed /api/group response: action=create_new, suggested_label=%s",
                response.suggestedLabel,
            )
            return response

    except Exception as exc:
        logger.exception("Agent execution failed: %s", exc)
        raise HTTPException(status_code=500, detail="Agent execution failed") from exc


@app.post("/agent/run", response_model=AgentResponse)
async def run_agent(request: AgentRequest) -> AgentResponse:
    user_id = request.user_id or DEFAULT_USER_ID
    session_id = request.ensure_session_id()

    try:
        await ensure_session(user_id=user_id, session_id=session_id)
    except Exception as exc:
        logger.exception("Failed to ensure session: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to prepare agent session") from exc

    new_message = Content(role="user", parts=[Part(text=request.message)])

    text_chunks: List[str] = []
    structured_text: Optional[str] = None
    try:
        events = runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=new_message,
        )

        async for event in events:
            log_adk_event("/agent/run", event)
            content = getattr(event, "content", None)
            if not content or not getattr(content, "parts", None):
                continue

            for part in content.parts:  # type: ignore[attr-defined]
                text = getattr(part, "text", None)
                if text:
                    text_chunks.append(text)

            for part in content.parts:  # type: ignore[attr-defined]
                function_response = getattr(part, "function_response", None)
                if (
                    function_response
                    and getattr(function_response, "response", None)
                    and isinstance(function_response.response, dict)
                    and function_response.response.get("type") == "final-message-json"
                ):
                    text = function_response.response.get("summary") or function_response.response.get("message")
                    if text:
                        structured_text = text
    except Exception as exc:
        logger.exception("Agent execution failed: %s", exc)
        raise HTTPException(status_code=500, detail="Agent execution failed") from exc

    final_text = structured_text or " ".join(text_chunks).strip()
    if not final_text:
        final_text = "I could not generate a response. Please try again with more detail."

    return AgentResponse(
        session_id=session_id,
        user_id=user_id,
        agent_name=AGENT_NAME,
        created_at=datetime.now(timezone.utc),
        response_text=final_text,
    )

