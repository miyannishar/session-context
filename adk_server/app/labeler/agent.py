"""
Labeler Agent - Generates descriptive labels for browsing sessions.
"""

import logging
import os
from typing import Optional

from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

from .prompt import LABELER_INSTRUCTION

logger = logging.getLogger(__name__)


def create_labeler_agent(api_key: Optional[str] = None, model: Optional[str] = None) -> LlmAgent:
    """
    Create the labeler agent that generates session labels.

    Args:
        api_key (str, optional): OpenAI API key. Defaults to env var.
        model (str, optional): Model identifier. Defaults to gpt-4o-mini.

    Returns:
        LlmAgent: The configured labeler agent
    """
    logger.info("Creating labeler agent")

    if not api_key:
        api_key = os.getenv("OPENAI_API_KEY")

    if not model:
        model = os.getenv("OPENAI_MODEL", "openai/gpt-4o-mini")

    agent = LlmAgent(
        name="labeler_agent",
        model=LiteLlm(model=model, api_key=api_key),
        description="Generates concise, descriptive labels for browsing sessions based on tab content.",
        instruction=LABELER_INSTRUCTION,
    )

    logger.info("Labeler agent created successfully")
    return agent

