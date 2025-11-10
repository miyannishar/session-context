"""
Common tools for the Session Context ADK agents.
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load .env before reading environment variables
load_dotenv(override=False)

SERPER_API_KEY = os.getenv("SERPER_API_KEY")
SERPER_API_URL = "https://google.serper.dev/search"


def web_search(query: str, num_results: Optional[int] = 5) -> Dict[str, Any]:
    """
    Search the web for information based on the provided query using Serper API.

    Args:
        query (str): The search query
        num_results (int, optional): Number of results to return. Defaults to 5.

    Returns:
        dict: The search results with status and data
    """
    logger.info(f"Performing web search for: {query}")

    if not SERPER_API_KEY:
        logger.error("SERPER_API_KEY is not set")
        return {
            "status": "error",
            "error_message": "SERPER_API_KEY is not configured",
            "query": query,
        }

    headers = {"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"}

    payload = {"q": query, "num": num_results}

    try:
        response = requests.post(SERPER_API_URL, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        search_results = response.json()

        formatted_results: Dict[str, Any] = {
            "status": "success",
            "query": query,
            "total_results": len(search_results.get("organic", [])),
            "results": [],
        }

        for result in search_results.get("organic", [])[:num_results]:
            result_item = {
                "title": result.get("title", ""),
                "link": result.get("link", ""),
                "snippet": result.get("snippet", ""),
            }
            formatted_results["results"].append(result_item)

        return formatted_results

    except Exception as e:
        logger.error(f"Error in web search: {str(e)}")
        return {"status": "error", "error_message": f"Failed to perform web search: {str(e)}", "query": query}


def get_current_datetime() -> str:
    """
    Get the current date and time in ISO 8601 format.

    Returns:
        str: Current date and time as a string
    """
    return datetime.now().isoformat()

