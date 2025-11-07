# SessionSwitch Server

Production-ready Express server that powers grouping and labeling decisions for the SessionSwitch Chrome extension.

---

## Prerequisites

- Node.js 18+
- An OpenAI API key with access to the models you intend to use

---

## Setup

```bash
npm install
cp env.example .env   # populate with your secrets and overrides
npm start              # or npm run dev for auto-reload with nodemon
```

Default port: `http://localhost:3000`

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | **Required.** OpenAI API key used for grouping/labeling. | – |
| `PORT` | Server port. | `3000` |
| `CORS_ALLOW_ORIGINS` | Comma-separated list of allowed origins (`*` to allow all). | `https://app.sessionswitch.com` |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window in milliseconds. | `60000` |
| `RATE_LIMIT_MAX` | Max requests within the rate-limit window. | `120` |
| `OPENAI_GROUP_MODEL` | Model used for grouping decisions. | `gpt-4.1` |
| `OPENAI_LABEL_MODEL` | Model used for session naming. | `gpt-3.5-turbo` |
| `LOG_REQUESTS` | Set to `false` to disable HTTP request logging. | `true` |
| `LOG_VERBOSE` | Set to `true` for verbose debug logging. | `false` |

> Tip: When self-hosting, set `CORS_ALLOW_ORIGINS` to the production domains that will call the API (e.g., your web app front-end and/or specific Chrome extension IDs).

---

## API Endpoints

| Method & Path | Description |
|---------------|-------------|
| `GET /api/health` | Returns server health and model info. |
| `POST /api/group` | Determines whether a tab should merge into an existing session or start a new one. Returns `{ action: 'merge'|'create_new', sessionId?, label? }`. |
| `POST /api/label` | Generates a short, descriptive label for a list of tabs. Returns `{ label }`. |

All endpoints expect/return JSON.

---

## Production Checklist

1. **Set environment variables**: `OPENAI_API_KEY`, `CORS_ALLOW_ORIGINS`, model overrides, etc.
2. **Use HTTPS**: Terminate TLS with your hosting provider or reverse proxy.
3. **Configure observability**: Pipe logs to your monitoring provider; adjust `LOG_REQUESTS`/`LOG_VERBOSE` as needed.
4. **Keep secrets safe**: Use a secret manager or environment variables—never commit `.env` files.
5. **Scale responsibly**: Tune rate limits and consider request caching if traffic increases.

---

## Deploying

The server is a standard Express app—deploy it to your preferred Node hosting platform (Render, Railway, Fly.io, Heroku, AWS, etc.).

Once deployed, update the Chrome extension settings (or default configuration) to point at your production URL, e.g. `https://session-context.vercel.app/api`.

### Deploying to Vercel

The `server/api` directory contains serverless functions compatible with Vercel’s Node runtime. To deploy:

1. Install the Vercel CLI and log in: `npm i -g vercel && vercel login`
2. From the `server/` directory run `vercel` (for preview) or `vercel --prod`
3. Configure the required environment variables in the Vercel dashboard (e.g., `OPENAI_API_KEY`, `CORS_ALLOW_ORIGINS`, model overrides)
4. After deployment, the API will be available at `https://<your-project>.vercel.app/api/*`
5. Update the SessionSwitch extension to use the deployed HTTPS endpoint (e.g., `https://api.sessionswitch.com/api`)

---

## Local Development

1. Run the server locally (`npm start`).
2. In the SessionSwitch extension options page, set the **Server API URL** to `http://localhost:3000/api`.
3. Capture tabs and inspect the server logs to iterate on prompt wording or heuristics.

---

## License

MIT

