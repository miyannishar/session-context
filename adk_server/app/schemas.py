"""
Pydantic request and response schemas for the FastAPI endpoints.
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Union
from uuid import uuid4

from pydantic import BaseModel, Field


class AgentRequest(BaseModel):
    """
    Request payload for interacting with the agent.
    """

    message: str = Field(..., description="User message sent to the agent.")
    session_id: Optional[str] = Field(default=None, description="Existing session identifier.")
    user_id: Optional[str] = Field(default=None, description="User identifier.")

    def ensure_session_id(self) -> str:
        if self.session_id:
            return self.session_id
        return str(uuid4())


class AgentResponse(BaseModel):
    """
    Response payload after the agent processes a message.
    """

    session_id: str
    user_id: str
    agent_name: str
    created_at: datetime
    response_text: str


# ----- Session Grouping Schemas -----


class TabContent(BaseModel):
    """Extracted content from a browser tab."""

    h1: Optional[str] = Field(default=None, description="Main heading")
    h2: Optional[List[str]] = Field(default=None, description="Section headings")
    metaDescription: Optional[str] = Field(default=None, description="Meta description")


class TabInfo(BaseModel):
    """Information about a single browser tab."""

    url: str = Field(..., description="Tab URL")
    title: Optional[str] = Field(default=None, description="Tab title")
    content: Optional[TabContent] = Field(default=None, description="Extracted content")


class ExistingSession(BaseModel):
    """Representation of an existing browsing session."""

    id: str = Field(..., description="Unique session identifier")
    label: Optional[str] = Field(default=None, description="Session label")
    tabList: List[TabInfo] = Field(default_factory=list, description="List of tabs in this session")


class GroupingRequest(BaseModel):
    """
    Request payload for session grouping decisions.
    Mirrors the Node.js backend schema.
    """

    newTab: TabInfo = Field(..., description="The newly opened tab to classify")
    existingSessions: List[ExistingSession] = Field(
        default_factory=list, description="List of existing sessions"
    )
    currentTabs: List[TabInfo] = Field(
        default_factory=list, description="Currently open tabs in the active window"
    )


class MergeAction(BaseModel):
    """Decision to merge tab into an existing session."""

    action: Literal["merge"] = Field(default="merge", description="Action type")
    sessionId: str = Field(..., description="ID of the session to merge into")
    updatedLabel: Optional[str] = Field(default=None, description="Updated session label")
    label: Optional[str] = Field(default=None, description="Alias for updatedLabel for extension compatibility")


class NewAction(BaseModel):
    """Decision to create a new session for the tab."""

    action: Literal["create_new"] = Field(default="create_new", description="Action type")
    suggestedLabel: Optional[str] = Field(default=None, description="Suggested label for the new session")
    label: Optional[str] = Field(default=None, description="Alias for suggestedLabel for extension compatibility")


class GroupingResponse(BaseModel):
    """
    Response payload for session grouping.
    """

    action: Literal["merge", "create_new", "no_action"] = Field(..., description="Grouping decision")
    sessionId: Optional[str] = Field(default=None, description="Session ID to merge into when action is merge")
    updatedLabel: Optional[str] = Field(default=None, description="Updated session label when merging")
    suggestedLabel: Optional[str] = Field(default=None, description="Suggested label when creating new")
    label: Optional[str] = Field(default=None, description="General label field for backwards compatibility")
    reason: Optional[str] = Field(default=None, description="Explanation for the decision (e.g., duplicate tab detected)")


# ----- Output Schema for Matcher Agent -----


class SessionMatchOutput(BaseModel):
    """
    Structured output schema for the matcher agent.
    """

    action: Literal["merge", "create_new", "no_action"] = Field(..., description="Whether to merge, create new, or skip")
    sessionId: Optional[str] = Field(default=None, description="Session ID if merging")
    updatedLabel: Optional[str] = Field(default=None, description="Updated label if merging")
    label: Optional[str] = Field(default=None, description="Alias for updated label if merging")
    suggestedLabel: Optional[str] = Field(default=None, description="Suggested label if creating new")
    reason: Optional[str] = Field(default=None, description="Explanation for the decision, especially for no_action")


# ----- Label Generation Schemas -----


class LabelRequest(BaseModel):
    """
    Request payload for generating a session label.
    """

    tabList: List[TabInfo] = Field(..., description="List of tabs in the session", min_length=1)


class LabelResponse(BaseModel):
    """
    Response payload for label generation.
    """

    label: str = Field(..., description="Generated session label")

