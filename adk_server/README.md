# Session Context ADK FastAPI Service

This service is a lightweight FastAPI wrapper around a single Google ADK agent powered by LiteLLM/OpenAI.  
It is intended to replace the existing Node.js backend that the Chrome extension uses for session classification.

## Features
- FastAPI application with `/health` and `/agent/run` endpoints.
- Google ADK runner backed by an in-memory session service.
- Single `LlmAgent` configured through environment variables.
- CORS-friendly for local testing and extension integration.
- Generates a fresh UUID session id automatically when clients omit one.

## Getting Started
1. Create a virtual environment and install dependencies:
   ```bash
   cd session-context/adk_server
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Set up the required environment variable(s):
   ```bash
   export OPENAI_API_KEY=sk-your-key
   # Optional overrides:
   # export OPENAI_MODEL=openai/gpt-4o
   # export SESSION_CONTEXT_AGENT_INSTRUCTION="Your custom instruction"
   ```
3. Launch the server:
   ```bash
   uvicorn app.main:app --reload
   ```
4. Send a request:
   ```bash
   curl -X POST http://localhost:8000/agent/run \
     -H "Content-Type: application/json" \
     -d '{"message":"Summarize my browsing history about startups"}'
   ```
   Response:
   ```json
   {
     "session_id": "generated-uuid",
     "user_id": "session-context",
     "agent_name": "session_context_agent",
     "created_at": "2025-11-09T08:05:32.123456+00:00",
     "response_text": "Final answer from the agent…"
   }
   ```

## Environment Variables
| Variable | Default | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | _required_ | API key used by LiteLLM for OpenAI models. |
| `OPENAI_MODEL` | `openai/gpt-4o-mini` | Model identifier passed to LiteLLM. |
| `SESSION_CONTEXT_AGENT_NAME` | `session_context_agent` | Friendly name for the ADK agent. |
| `SESSION_CONTEXT_AGENT_INSTRUCTION` | “Summarize the user's browsing context…” | Instruction prompt for the agent. |
| `SESSION_CONTEXT_DEFAULT_USER_ID` | `session-context` | Fallback user ID when none is provided. |
| `SESSION_CONTEXT_ALLOW_ORIGINS` | `*` | Comma-separated list of allowed CORS origins. |

## Folder Structure
```
adk_server/
├── app/
│   ├── __init__.py
│   ├── agent.py
│   ├── config.py
│   ├── main.py
│   ├── runtime.py
│   └── schemas.py
└── requirements.txt
```

