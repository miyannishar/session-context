"""
Re-export the shared Google ADK agent objects defined in `agent.py`.
"""

from .agent import (
    AGENT_DESCRIPTION,
    AGENT_INSTRUCTION,
    AGENT_NAME,
    OPENAI_MODEL,
    adk_app,
    root_agent,
    runner,
    session_service,
)

__all__ = [
    "AGENT_DESCRIPTION",
    "AGENT_INSTRUCTION",
    "AGENT_NAME",
    "OPENAI_MODEL",
    "adk_app",
    "root_agent",
    "runner",
    "session_service",
]

