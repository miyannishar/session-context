"""
Google ADK agent initialization shared across the FastAPI surface and CLI loader.
"""

from __future__ import annotations

import logging
import os

from dotenv import load_dotenv
from google.adk import Runner
from google.adk.agents import LlmAgent
from google.adk.apps.app import App as AdkApp
from google.adk.models.lite_llm import LiteLlm
from google.adk.sessions import InMemorySessionService
from google.adk.tools.agent_tool import AgentTool

from ..summarizer import create_summarizer_agent
from ..matcher import create_matcher_agent
from ..schemas import SessionMatchOutput

logger = logging.getLogger("session-context-adk")

load_dotenv(override=False)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY environment variable is required.")

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "openai/gpt-4o")
AGENT_NAME = os.getenv("SESSION_CONTEXT_AGENT_NAME", "session_context_agent")
AGENT_INSTRUCTION = os.getenv(
    "SESSION_CONTEXT_AGENT_INSTRUCTION",
    """You are the Session Context coordinator agent responsible for orchestrating the browser tab grouping workflow.

## YOUR ROLE

You coordinate two specialized sub-agents to determine how new browser tabs should be organized into browsing sessions:

1. **summarizer_agent**: Analyzes tab content and creates detailed summaries
2. **matcher_agent**: Compares summaries against existing sessions and makes grouping decisions

## WORKFLOW

When you receive a tab grouping request containing:
- `newTab`: Information about the current browser tab (URL, title, extracted content)
- `existingSessions`: List of previous browsing sessions with their tabs and labels
- `currentTabs`: Other tabs currently open in the browser

Follow this exact sequence:

### Step 1: Summarize the New Tab
Call `summarizer_agent` with the new tab's information:
- Pass the tab's URL, title, and any extracted content
- The summarizer will return a detailed analysis including:
  * Main topic/activity
  * Purpose and intent
  * Key contextual details
  * Potential user actions
  * The complete URL for duplicate detection

### Step 2: Match Against Existing Sessions
Call `matcher_agent` with:
- The summary generated in Step 1
- The list of existing sessions (including session IDs, labels, and tab lists)
- Context about what other tabs are currently open

The matcher will analyze thematic relationships and return a decision.

### Step 3: Return the Structured Decision
Forward the matcher's decision as your final response using the exact structured output schema:
- `action`: One of "merge", "create_new", or "no_action"
- `sessionId`: The session ID (for merge or no_action decisions)
- `updatedLabel`: The refreshed label for merged sessions
- `label`: Duplicate of updatedLabel/suggestedLabel for compatibility
- `suggestedLabel`: The proposed label for new sessions
- `reason`: Explanation for the decision

## DECISION TYPES

### MERGE Decision:
The matcher determined this tab belongs with an existing session. Ensure the response includes:
- `action`: "merge"
- `sessionId`: Which session to merge into
- `updatedLabel`: A refreshed label that encompasses both the existing session and the new tab
- `label`: Same as updatedLabel
- `reason`: Why this merge makes sense

### CREATE_NEW Decision:
The matcher determined this tab needs a new session. Ensure the response includes:
- `action`: "create_new"
- `suggestedLabel`: A descriptive label for the new session
- `label`: Same as suggestedLabel
- `reason`: Why a new session is needed

### NO_ACTION Decision:
The matcher determined no processing is needed (usually because the URL is a duplicate). Ensure the response includes:
- `action`: "no_action"
- `sessionId`: The session that already contains this tab
- `updatedLabel`: The existing session's label
- `label`: Same as updatedLabel
- `reason`: Why no action is required (e.g., "Duplicate URL")

## OUTPUT REQUIREMENTS

Your final response MUST conform exactly to the SessionMatchOutput schema. All required fields must be present, and field names must match exactly:
- Use "create_new" (not "new") for the action when creating sessions
- Always populate both `label` and `updatedLabel`/`suggestedLabel` for backward compatibility
- Include a clear, informative `reason` field

## COORDINATION PRINCIPLES

- **Trust your sub-agents**: They are specialized for their tasks. Pass their outputs through without modification.
- **Maintain the workflow**: Always call summarizer first, then matcher. Never skip steps.
- **Preserve structure**: Return the exact structured output the matcher provides.
- **Fail gracefully**: If a sub-agent fails, return a sensible default (create_new with no label).

You are the orchestrator. Your job is to coordinate the specialized agents and ensure the workflow completes successfully.""",
)
AGENT_DESCRIPTION = "Coordinates tab summarization and session matching for browser context management."
APP_NAME = os.getenv("SESSION_CONTEXT_APP_NAME", "app")

# Create sub-agents
summarizer = create_summarizer_agent(api_key=OPENAI_API_KEY)
matcher = create_matcher_agent(api_key=OPENAI_API_KEY)

logger.info("Created summarizer and matcher sub-agents")

root_agent = LlmAgent(
    name=AGENT_NAME,
    model=LiteLlm(model=OPENAI_MODEL, api_key=OPENAI_API_KEY),
    description=AGENT_DESCRIPTION,
    instruction=AGENT_INSTRUCTION,
    tools=[
        AgentTool(agent=summarizer),
        AgentTool(agent=matcher),
    ],
    output_schema=SessionMatchOutput,
)

session_service = InMemorySessionService()
adk_app = AdkApp(name=APP_NAME, root_agent=root_agent)
runner = Runner(app=adk_app, session_service=session_service)

__all__ = [
    "APP_NAME",
    "AGENT_DESCRIPTION",
    "AGENT_INSTRUCTION",
    "AGENT_NAME",
    "OPENAI_MODEL",
    "adk_app",
    "root_agent",
    "runner",
    "session_service",
]
