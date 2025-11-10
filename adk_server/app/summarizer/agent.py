"""
Summarizer Agent - Analyzes current tab information and produces a structured summary.
"""

import logging
import os
from typing import Optional

from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

from ..base_agent.tools import web_search, get_current_datetime
from .prompt import SUMMARIZER_INSTRUCTION

logger = logging.getLogger(__name__)


def create_summarizer_agent(api_key: Optional[str] = None, model: Optional[str] = None) -> LlmAgent:
    """
    Create the summarizer agent that analyzes tab content.

    Args:
        api_key (str, optional): OpenAI API key. Defaults to env var.
        model (str, optional): Model identifier. Defaults to gpt-4o-mini.

    Returns:
        LlmAgent: The configured summarizer agent
    """
    logger.info("Creating summarizer agent")

    if not api_key:
        api_key = os.getenv("OPENAI_API_KEY")

    if not model:
        model = os.getenv("OPENAI_MODEL", "openai/gpt-4o-mini")

    agent = LlmAgent(
        name="summarizer_agent",
        model=LiteLlm(model=model, api_key=api_key),
        description="Analyzes current tab information and produces a structured summary with web search support.",
        instruction=SUMMARIZER_INSTRUCTION,
        tools=[web_search, get_current_datetime],
    )

    logger.info("Summarizer agent created successfully")
    return agent

