/**
 * Example Server for SessionSwitch
 * 
 * This is a simple Express server that handles grouping and labeling decisions.
 * 
 * To run:
 * 1. npm install express openai dotenv
 * 2. Create .env file with: OPENAI_API_KEY=sk-your-key-here
 * 3. npm start
 */

require('dotenv').config();

const compression = require('compression');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { OpenAI } = require('openai');

// ---------------------------------------------------------------------------
// Environment configuration
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || '3000', 10);
const GROUP_MODEL = process.env.OPENAI_GROUP_MODEL || 'gpt-4.1';
const LABEL_MODEL = process.env.OPENAI_LABEL_MODEL || 'gpt-3.5-turbo';
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '120', 10);
const LOG_REQUESTS = process.env.LOG_REQUESTS !== 'false';
const LOG_VERBOSE = process.env.LOG_VERBOSE === 'true';
const RAW_ALLOWED_ORIGINS = process.env.CORS_ALLOW_ORIGINS || '*';
const ALLOWED_ORIGINS = RAW_ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);

if (!process.env.OPENAI_API_KEY) {
  console.error('\n❌ OPENAI_API_KEY is not set. Add it to your environment or .env file.\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// App & middleware
// ---------------------------------------------------------------------------

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.set('trust proxy', 1); // needed when behind a proxy/load balancer

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));

if (LOG_REQUESTS) {
  app.use(morgan('combined'));
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes('*')) {
      return callback(null, true);
    }
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'), false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

app.use('/api/', limiter);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const logVerbose = (...args) => {
  if (LOG_VERBOSE) {
    console.log(...args);
  }
};

function formatTabContent(tab) {
  let content = `Title: ${tab.title || 'Untitled'}\n`;

  if (tab.content) {
    if (tab.content.h1 && tab.content.h1 !== tab.title) {
      content += `Main Heading: ${tab.content.h1}\n`;
    }
    if (tab.content.h2 && tab.content.h2.length > 0) {
      content += `Sections: ${tab.content.h2.slice(0, 3).join(', ')}\n`;
    }
    if (tab.content.metaDescription) {
      content += `Description: ${tab.content.metaDescription.substring(0, 150)}\n`;
    }
  }

  try {
    const url = new URL(tab.url);
    content += `Site: ${url.hostname}`;
  } catch (error) {
    content += `Site: ${tab.url}`;
  }

  return content;
}

async function callChatCompletion({ model, messages, maxTokens = 30, temperature = 0.7 }) {
  return openai.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  });
}

function sanitizeSessionsForLog(sessions = []) {
  return sessions.slice(0, 3).map((session, index) => ({
    label: session.label || 'Unnamed',
    tabCount: session.tabList?.length || 0,
    id: session.id,
    index,
  }));
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    model_grouping: GROUP_MODEL,
    model_label: LABEL_MODEL,
  });
});

app.post('/api/group', async (req, res) => {
  try {
    const { newTab, existingSessions = [], currentTabs = [] } = req.body || {};

    if (!newTab || !newTab.url) {
      return res.status(400).json({ error: 'newTab with url is required' });
    }

    logVerbose('Grouping request', {
      newTabUrl: newTab.url,
      existingSessionCount: existingSessions.length,
      currentTabCount: currentTabs.length,
      existingSessionsPreview: sanitizeSessionsForLog(existingSessions),
    });

    if (!existingSessions.length) {
      return res.json({ action: 'create_new', label: null });
    }

    const newTabContext = formatTabContent(newTab);

    const currentTabsContext = currentTabs
      .filter((tab) => tab.url && tab.url !== newTab.url)
      .slice(0, 10)
      .map((tab) => `- ${tab.title || 'Untitled'} — ${tab.url}`)
      .join('\n');

    const sessionsContext = existingSessions
      .map((session, index) => {
        const tabContexts = (session.tabList || [])
          .map((tab) => formatTabContent(tab))
          .filter(Boolean);

        if (!tabContexts.length) {
          return null;
        }

        return `Session ${index + 1} (${session.label || 'Unnamed'}):\n${tabContexts.join('\n\n')}`;
      })
      .filter(Boolean)
      .join('\n\n---\n\n');

    const prompt = `Role: You are an expert session-grouping assistant for a browser-context tool.

Task: Given a newly opened browser tab and a list of existing work sessions, decide whether the new tab belongs to any of the existing sessions or whether it should start a NEW session.

Important:

Focus exclusively on what work or task the user is doing (the subject matter, purpose, goal) — not the platform, website, or tool being used.

Only merge the tab into an existing session if it clearly shares the same task/activity, project/feature, or problem/goal.

Be generous: if the underlying work is the same (even across different platforms/tools), merge it. Only output NEW if the work clearly differs.

Input Data:
NEW TAB:
${newTabContext}

CURRENT OPEN TABS IN THIS WINDOW:
${currentTabsContext || '(none)'}

EXISTING SESSIONS:
${sessionsContext || '(none)'}

Output Format:
Return exactly the session number (e.g., “Session 3”) if it should merge into an existing session, or the word NEW (all caps) if a new session should be created. No additional text.`;

    const response = await callChatCompletion({
      model: GROUP_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are an assistant that analyzes browser tabs and determines if they belong to the same work session. Focus on the ACTUAL WORK BEING DONE, not the platform or website.',
        },
        { role: 'user', content: prompt },
      ],
      maxTokens: 10,
      temperature: 0.2,
    });

    const decisionRaw = response.choices[0]?.message?.content?.trim() || 'NEW';
    const decision = decisionRaw.toUpperCase();
    logVerbose('OpenAI grouping decision', { decisionRaw, decision });

    if (decision !== 'NEW') {
      const sessionMatch = decision.match(/\d+/);
      if (sessionMatch) {
        const sessionIndex = Number(sessionMatch[0]) - 1;
        if (sessionIndex >= 0 && sessionIndex < existingSessions.length) {
          const matchedSession = existingSessions[sessionIndex];
          logVerbose('Merging into session', { sessionId: matchedSession.id, label: matchedSession.label });

          const combinedTabs = [...(matchedSession.tabList || []), newTab];
          const label = await generateLabel(combinedTabs);

          return res.json({ action: 'merge', sessionId: matchedSession.id, label });
        }
      }
    }

    return res.json({ action: 'create_new', label: null });
  } catch (error) {
    console.error('Error in /api/group:', error);
    return res.status(500).json({ error: 'Unable to process grouping request' });
  }
});

app.post('/api/label', async (req, res) => {
  try {
    const { tabList } = req.body || {};

    if (!tabList || !Array.isArray(tabList) || tabList.length === 0) {
      return res.status(400).json({ error: 'tabList is required' });
    }

    logVerbose('Label request received', {
      tabCount: tabList.length,
      sample: tabList.slice(0, 3).map((tab) => tab.url),
    });

    const label = await generateLabel(tabList);

    if (!label) {
      return res.status(502).json({ error: 'Unable to generate label' });
    }

    return res.json({ label });
  } catch (error) {
    console.error('Error in /api/label:', error);
    return res.status(500).json({ error: 'Unable to generate label' });
  }
});

// ---------------------------------------------------------------------------
// Label generator (shared by both endpoints)
// ---------------------------------------------------------------------------

async function generateLabel(tabList) {
  if (!tabList || tabList.length === 0) {
    return null;
  }

  const tabContexts = tabList
    .map((tab) => formatTabContent(tab))
    .filter(Boolean)
    .join('\n\n---\n\n');

  const prompt = `Analyze these browser tabs from a work session. The tabs may live on different platforms but represent a cohesive work context.

Requirements:
- Maximum 4-5 words
- Describe the work context, not the platforms
- Identify the common theme across all tabs regardless of website/tool
- Title case
- No quotes or punctuation
- Return only the name

Tab contexts:
${tabContexts}

Session name:`;

  try {
    const response = await callChatCompletion({
      model: LABEL_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You create concise, descriptive names for browser sessions based on tab context.',
        },
        { role: 'user', content: prompt },
      ],
      maxTokens: 30,
      temperature: 0.6,
    });

    let label = response.choices[0]?.message?.content?.trim() || '';
    label = label.replace(/^['"]|['"]$/g, '').replace(/[.,;:!?]+$/g, '').trim().substring(0, 50);

    logVerbose('Generated label', { label });
    return label || null;
  } catch (error) {
    console.error('Error generating label:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed by CORS policy' });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`\n✅ SessionSwitch server running on port ${PORT}`);
  console.log('   Grouping model:', GROUP_MODEL);
  console.log('   Label model   :', LABEL_MODEL);
  console.log('   Rate limit    :', `${RATE_LIMIT_MAX} requests / ${RATE_LIMIT_WINDOW_MS / 1000}s`);
  console.log('   CORS origins  :', RAW_ALLOWED_ORIGINS);
});

