"""
Matcher Agent - Determines if current tab belongs to an existing session or needs a new one.
"""

import logging
import os
from typing import Optional

from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

from .prompt import MATCHER_INSTRUCTION

logger = logging.getLogger(__name__)


def create_matcher_agent(api_key: Optional[str] = None, model: Optional[str] = None) -> LlmAgent:
    """
    Create the matcher agent that decides session grouping.

    Args:
        api_key (str, optional): OpenAI API key. Defaults to env var.
        model (str, optional): Model identifier. Defaults to gpt-4o.

    Returns:
        LlmAgent: The configured matcher agent
    """
    logger.info("Creating matcher agent")

    if not api_key:
        api_key = os.getenv("OPENAI_API_KEY")

    if not model:
        model = os.getenv("OPENAI_MODEL", "openai/gpt-4o")

    agent = LlmAgent(
        name="matcher_agent",
        model=LiteLlm(model=model, api_key=api_key),
        description="Determines if current tab should merge into an existing session or create a new one.",
        instruction=MATCHER_INSTRUCTION,
    )

    logger.info("Matcher agent created successfully")
    return agent

