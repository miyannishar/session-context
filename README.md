# SessionSwitch

SessionSwitch is a Manifest V3 Chrome extension that captures your active work context, groups related tabs into sessions, and makes it painless to resume later. Tab capture happens locally, while a lightweight Node.js server (included) calls OpenAI to decide how tabs should be grouped and named.

---

## Features

- **Automatic tab capture**: Records URL, title, favicon, timestamps, and extracted page content whenever you switch or finish loading a tab.
- **Session heuristics**: Detects session boundaries using idle thresholds (default 12 minutes) and significant domain changes.
- **Cleanup routines**: Discards single-tab sessions older than 5 minutes and removes any session older than 24 hours.
- **Duplicate suppression**: Ignores repeated captures of the same tab/URL within two minutes.
- **AI-powered grouping & labeling**: Sends captured context to the server; the server uses OpenAI to merge into an existing session or create a new one and to generate descriptive session names.
- **Manual snapshots**: Save the current window’s tabs as a named session from the popup UI.
- **Resume sessions**: Re-open all tabs for any saved session with one click.
- **Configurable settings**: Adjust idle thresholds, exclude domains, pause capture, and set the server URL from the options page.
- **Local persistence**: Sessions and settings live in `chrome.storage.local`; no external database required.

---

## Directory Structure

```
session-context/
├── background.js
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── settings/
│   ├── settings.html
│   ├── settings.css
│   └── settings.js
├── utils/
│   ├── storage.js
│   ├── sessionizer.js
│   ├── contentExtractor.js
│   └── serverAPI.js
├── icons/
│   ├── generate-icons.html
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── server/
    ├── server.js
    ├── package.json
    ├── package-lock.json
    └── README.md
```

---

## Core Components

### `manifest.json`
Sets up the MV3 extension, permissions, background service worker (`background.js`), popup (`popup/popup.html`), and options page (`settings/settings.html`).

### Background Service Worker (`background.js`)
- Initializes session state on install/startup and sets idle detection.
- Captures active tabs, extracts page content, and creates tab capture entries via `utils/storage.js`.
- Applies heuristics (idle threshold + domain changes) to determine session boundaries.
- Calls the server (`utils/serverAPI.js`) for grouping decisions and labels.
- Avoids duplicate captures and runs automatic cleanup.

### Popup (`popup/`)
- `popup.html` & `popup.css`: Gradient-themed UI listing sessions.
- `popup.js`: Loads sessions, renders tab counts/time ranges, provides Resume/Delete controls, and supports manual snapshots.

### Settings (`settings/`)
- `settings.html` & `settings.css`: Form for idle threshold, excluded domains, pause capture, and server URL.
- `settings.js`: Loads/saves settings through `utils/storage.js`, validates inputs, and includes a “Use local server” helper.

### Utilities (`utils/`)
- `storage.js`: Wrapper around `chrome.storage.local` (sessions, settings, cleanup, ID generation).
- `sessionizer.js`: Idle/domain heuristics and tab deduplication.
- `contentExtractor.js`: Injected script that gathers heading/meta/body snippets for AI context.
- `serverAPI.js`: Fetch client for `/api/group`, `/api/label`, and `/api/health` endpoints.

### Icons (`icons/`)
PNG icon set plus `generate-icons.html` for regenerating assets.

### AI Server (`server/`)
- Express server (`server.js`) exposing:
  - `GET /api/health`
  - `POST /api/group` – Determines merge vs. new session and returns an optional label.
  - `POST /api/label` – Generates concise session names.
- Requires `OPENAI_API_KEY` in `.env`. See `server/README.md` for setup.

#### Quick Start (Server)

```bash
cd server
npm install
cp env.example .env   # add OPENAI_API_KEY
npm start
# Server runs on http://localhost:3000
```

The extension defaults to the production API (`https://api.sessionswitch.com/api`). When running locally, open the options page and set **Server API URL** to `http://localhost:3000/api`.

---

## Development Workflow

1. **Load the extension**: `chrome://extensions` → enable Developer Mode → Load unpacked → select this folder.
2. **Run the server**: Start the local server and configure the extension settings with its URL if you want to override the production API.
3. **Test**: Open various tabs, inspect the popup for sessions, and watch the server logs for AI decisions.
4. **Package**: Zip the directory if you plan to distribute the extension; no bundling step is needed.

---

## Customization Tips

- **Prompts**: Adjust `server/server.js` prompts to fine-tune grouping and naming behavior.
- **Styling**: Modify `popup.css` and `settings.css` to match your brand.
- **Icons**: Replace the PNGs or regenerate them with `icons/generate-icons.html`.
- **Backend hardening**: Add authentication, HTTPS, rate limiting, and richer logging before deploying the server publicly.

---

## License

No license is bundled. Add one if you plan to distribute SessionSwitch.
