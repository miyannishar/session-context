"""
Package entry-point for the Session Context ADK application.

The ADK CLI expects the package to expose either a `root_agent` or an `app`
instance. They are re-exported from `app.base_agent` so that `adk web` can
discover them automatically.
"""

from .base_agent import adk_app, root_agent

app = adk_app

__all__ = ["app", "root_agent"]

