# SessionSwitch

SessionSwitch is a Manifest V3 Chrome extension that intelligently captures your browsing context, groups related tabs into sessions using AI-powered agents, and makes it effortless to resume later. Tab capture happens locally, while a Python FastAPI backend with Google ADK (Agent Development Kit) uses multi-agent reasoning to decide how tabs should be grouped and named.

---

## Features

- **Automatic tab capture**: Records URL, title, favicon, timestamps, and extracted page content whenever you switch or finish loading a tab.
- **Session heuristics**: Detects session boundaries using idle thresholds (default 12 minutes) and significant domain changes.
- **Intelligent cleanup**: Automatically removes single-tab sessions older than 10 minutes and expires sessions after 24 hours.
- **Duplicate suppression**: Ignores repeated captures of the same tab/URL within two minutes and detects duplicate tabs across sessions.
- **Multi-agent AI system**: Uses Google ADK with specialized agents:
  - **Summarizer Agent**: Analyzes tab content and context with optional web search
  - **Matcher Agent**: Intelligently groups related tabs with generous merging logic
  - **Labeler Agent**: Generates concise, descriptive session names
  - **Base Agent**: Coordinates all agents and returns structured decisions
- **Smart session actions**: Three decision types - merge into existing session, create new session, or no action (for duplicates)
- **Manual snapshots**: Save the current window's tabs as a named session from the popup UI.
- **Resume & group sessions**: Re-open all tabs or create tab groups for any saved session with one click.
- **Configurable settings**: Adjust idle thresholds, exclude domains, pause capture, and set the server URL from the options page.
- **Local persistence**: Sessions and settings live in `chrome.storage.local`; no external database required.

---

## Directory Structure

```
session-context/
├── background.js                    # Service worker with optimized helpers
├── manifest.json                    # Extension configuration
├── popup/                           # Extension popup UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── settings/                        # Settings/options page
│   ├── settings.html
│   ├── settings.css
│   └── settings.js
├── utils/                          # Core utilities (optimized)
│   ├── constants.js                # Central configuration & constants
│   ├── storage.js                  # Chrome storage wrapper
│   ├── sessionizer.js              # Session boundary detection
│   ├── contentExtractor.js         # Page content extraction
│   └── serverAPI.js                # Backend API client
├── icons/                          # Extension icons
│   ├── generate-icons.html
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── adk_server/                     # Python FastAPI + Google ADK backend
    ├── main.py                # FastAPI server with /api/group & /api/label
    │   ├── schemas.py             # Pydantic models for requests/responses
    │   ├── base_agent/            # Root coordinator agent
    │   │   ├── agent.py
    │   │   └── tools.py           # Web search & datetime tools
    │   ├── summarizer/            # Tab content summarization agent
    │   │   ├── agent.py
    │   │   └── prompt.py
    │   ├── matcher/               # Session matching agent
    │   │   ├── agent.py
    │   │   └── prompt.py
    │   └── labeler/               # Session label generation agent
    │       ├── agent.py
    │       └── prompt.py
    ├── requirements.txt
    └── .env                       # API keys (OPENAI_API_KEY, SERPER_API_KEY)
```

---

## Core Components

### Extension

#### `manifest.json`
Manifest V3 configuration defining permissions, service worker, popup, and options page.

#### Background Service Worker (`background.js`)
**Optimized with helper functions and constants**:
- Initializes session state on install/startup with 15-second idle detection
- Captures active tabs with `shouldSkipTab()` validation
- Extracts page content via `contentExtractor.js`
- Applies session boundary heuristics (idle threshold + domain changes)
- Calls multi-agent backend via `serverAPI.js` for intelligent grouping
- Handles three decision types: `merge`, `create_new`, `no_action`
- Runs automatic cleanup every 5 minutes for stale sessions
- **New helpers**: `handleServerDecision()`, `handleNoActionDecision()`

#### Popup (`popup/`)
- `popup.html` & `popup.css`: Modern gradient-themed UI
- `popup.js`: Session management with Resume, Group, Delete, and manual snapshot features

#### Settings (`settings/`)
- Configuration UI for idle threshold, excluded domains, pause capture, and server URL
- Validates inputs and provides quick "Use local server" helper

#### Utilities (`utils/`)
**Optimized and production-ready**:
- `constants.js` ⭐ **NEW**: Central configuration (time constants, server config, action types)
- `storage.js`: Chrome storage wrapper with optimized cleanup logic
- `sessionizer.js`: Session boundary detection and tab deduplication
- `contentExtractor.js`: **52% smaller** - extracts headings, meta, and body text for AI context
- `serverAPI.js`: Type-safe API client for backend endpoints

### Backend (Python FastAPI + Google ADK)

#### Multi-Agent Architecture (`adk_server/`)

The backend uses Google's Agent Development Kit with a coordinator pattern:

**Root Agent** (`base_agent/`)
- Orchestrates the entire decision flow
- Delegates to specialized sub-agents
- Returns structured JSON with `SessionMatchOutput` schema

**Summarizer Agent** (`summarizer/`)
- Analyzes tab title, URL, and extracted content
- Uses `web_search` tool for additional context
- Produces structured summaries with explicit URLs

**Matcher Agent** (`matcher/`)
- Compares new tab summary against existing sessions
- **Generous merging logic**: focuses on broad themes, not exact keywords
- Generates updated labels that reflect both old + new content
- Decides: `merge`, `create_new`, or `no_action` (for duplicates)

**Labeler Agent** (`labeler/`)
- Generates concise 4-5 word session labels
- Analyzes tab titles, URLs, and content patterns
- Used for standalone label generation

**Tools** (`base_agent/tools.py`)
- `web_search`: Serper API integration for real-time info
- `get_current_datetime`: Context for time-sensitive queries

#### API Endpoints (`main.py`)

**`POST /api/group`**
- Receives: `newTab`, `existingSessions`, `currentTabs`
- Checks for duplicate tab URLs (fast path)
- Runs multi-agent flow: summarize → match → respond
- Returns: `{ action, sessionId, updatedLabel, suggestedLabel, reason }`
- Comprehensive logging of all ADK events

**`POST /api/label`**
- Receives: `tabList`
- Uses unique session ID per request (no history pollution)
- Returns: `{ label }`

**`GET /health`**
- Health check endpoint

#### Quick Start (ADK Server)

```bash
cd adk_server

# Create conda environment
conda create --name session python=3.11
conda activate session

# Install dependencies
python -m pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Add: OPENAI_API_KEY=sk-...
#      SERPER_API_KEY=... (optional, for web search)

# Start server
uvicorn app.main:app --reload
# Server runs on http://localhost:8000
```

By default the extension points to the hosted backend at `https://session-context.onrender.com/api`. When running locally, open the options page and set **Server API URL** to `http://localhost:8000/api`.

---

## Development Workflow

1. **Start the ADK server**:
   ```bash
   cd adk_server
   conda activate session
   uvicorn app.main:app --reload
   ```

2. **Load the extension**:
   - Go to `chrome://extensions`
   - Enable **Developer Mode**
   - Click **Load unpacked**
   - Select the `session-context` folder

3. **Configure (optional)**:
   - Open the extension options page
   - Keep the default hosted URL `https://session-context.onrender.com/api`, or switch to `http://localhost:8000/api` if you’re testing locally
   - Adjust idle threshold, excluded domains as needed

4. **Test**:
   - Browse various websites (try startup directories, research sites, etc.)
   - Open the popup to see captured sessions
   - Check console logs for decision flow
   - Watch server logs for multi-agent reasoning

5. **Monitor**:
   - Extension console: `chrome://extensions` → SessionSwitch → "service worker"
   - Server logs: Watch ADK event JSON in terminal
   - Network tab: Inspect `/api/group` and `/api/label` requests

6. **Package** (for distribution):
   - Zip the `session-context` directory
   - Exclude `adk_server/__pycache__`, `node_modules`, `.env` files
   - No bundling step needed for the extension

---

## Customization Tips

### Extension
- **Constants**: Modify `utils/constants.js` for thresholds, timeouts, and configurations
- **Styling**: Update `popup.css` and `settings.css` for custom themes
- **Icons**: Replace PNGs or regenerate with `icons/generate-icons.html`
- **Validation**: Adjust `shouldSkipTab()` in `background.js` for custom filtering

### Backend (ADK Server)
- **Agent prompts**: Fine-tune behavior in:
  - `app/summarizer/prompt.py` - Tab analysis style
  - `app/matcher/prompt.py` - Merging logic and label generation
  - `app/labeler/prompt.py` - Label format and length
  - `app/base_agent/agent.py` - Coordinator instructions
- **Tools**: Add new tools in `app/base_agent/tools.py` (e.g., database lookup, API calls)
- **LLM model**: Change `LiteLlm(model_id="...")` in agent files
- **Logging**: Adjust log levels in `app/main.py`
- **CORS**: Modify `CORSMiddleware` origins for production

### Production Hardening
- **Extension**: 
  - Consider moving constants to options page for user configuration
  - Add analytics/telemetry (with user consent)
  - Implement backup/restore for sessions
- **Backend**:
  - Add authentication (API keys, OAuth)
  - Enable HTTPS with proper certificates
  - Implement rate limiting (per-user, per-IP)
  - Add monitoring (Sentry, DataDog)
  - Use persistent session storage (Redis, PostgreSQL)
  - Deploy with Docker/Kubernetes

---

## Code Quality & Optimizations

**Recent optimizations (Nov 2025)**:
- ✅ Created `constants.js` for centralized configuration
- ✅ Reduced codebase by 128 lines (12% smaller)
- ✅ Removed 84 lines of unused code from `contentExtractor.js`
- ✅ Extracted helper functions: `shouldSkipTab()`, `handleServerDecision()`, `handleNoActionDecision()`
- ✅ Optimized storage operations with Set-based lookups
- ✅ Modernized JavaScript with optional chaining and nullish coalescing
- ✅ Type-safe action constants instead of string literals
- ✅ Comprehensive ADK event logging for debugging
- ✅ Zero linter errors across all files

**Performance**:
- Fast duplicate detection (O(1) lookups)
- Reduced redundant storage calls
- Optimized filtering with short-circuit evaluation
- Automatic cleanup every 5 minutes

---

## License

No license is bundled. Add one if you plan to distribute SessionSwitch.

---

## Acknowledgments

- Built with **Google ADK** (Agent Development Kit)
- Uses **FastAPI** for high-performance async backend
- Content extraction powered by Chrome's **Scripting API**
- Session storage via Chrome's **local storage API**

---

**Last Updated**: November 2025  
**Status**: ✅ Production-ready with optimized codebase
