const { OpenAI } = require('openai');

const config = require('./config');
const logger = require('./logger');

if (!config.openAiKey) {
  throw new Error('OPENAI_API_KEY is not set. Add it to your environment or .env file.');
}

const openai = new OpenAI({ apiKey: config.openAiKey });

function formatTabContent(tab = {}) {
  let content = `Title: ${tab.title || 'Untitled'}\n`;

  if (tab.content) {
    if (tab.content.h1 && tab.content.h1 !== tab.title) {
      content += `Main Heading: ${tab.content.h1}\n`;
    }
    if (Array.isArray(tab.content.h2) && tab.content.h2.length > 0) {
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
  const response = await openai.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  });

  return response.choices[0]?.message?.content?.trim() || '';
}

async function generateSessionLabel(tabList = []) {
  if (!Array.isArray(tabList) || tabList.length === 0) {
    throw new Error('tabList must contain at least one tab');
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

  const raw = await callChatCompletion({
    model: config.labelingModel,
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

  const label = raw.replace(/^['"]|['"]$/g, '').replace(/[.,;:!?]+$/g, '').trim().substring(0, 50);
  logger.verbose('Generated session label', label);
  return label || null;
}

async function handleGroupingRequest(payload = {}) {
  const { newTab, existingSessions = [], currentTabs = [] } = payload;

  if (!newTab || !newTab.url) {
    throw new Error('newTab with url is required');
  }

  logger.verbose('Grouping request', {
    newTab: newTab.url,
    existingSessions: existingSessions.length,
    currentTabs: currentTabs.length,
  });

  if (!existingSessions.length) {
    return { action: 'create_new', label: null };
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

Focus exclusively on what work or task the user is doing — not the platform, website, or tool being used.

Only merge the tab into an existing session if it clearly shares the same task/activity, project/feature, or problem/goal. Be generous: if the underlying work is the same (even across different platforms/tools), merge it. Only output NEW if the work clearly differs.

NEW TAB:
${newTabContext}

CURRENT OPEN TABS IN THIS WINDOW:
${currentTabsContext || '(none)'}

EXISTING SESSIONS:
${sessionsContext || '(none)'}

Output exactly one item: the session number (e.g., "Session 3") if it belongs to an existing session, or NEW if a new session should be created.`;

  const decisionRaw = await callChatCompletion({
    model: config.groupingModel,
    messages: [
      {
        role: 'system',
        content: 'You determine if a browser tab belongs to an existing work session based on actual tasks, not platforms.',
      },
      { role: 'user', content: prompt },
    ],
    maxTokens: 10,
    temperature: 0.2,
  });

  const decisionUpper = decisionRaw.toUpperCase();
  logger.verbose('Grouping response', decisionUpper);

  if (decisionUpper !== 'NEW') {
    const sessionMatch = decisionUpper.match(/\d+/);
    if (sessionMatch) {
      const sessionIndex = Number(sessionMatch[0]) - 1;
      if (sessionIndex >= 0 && sessionIndex < existingSessions.length) {
        const matchedSession = existingSessions[sessionIndex];
        const combinedTabs = [...(matchedSession.tabList || []), newTab];
        const label = await generateSessionLabel(combinedTabs);

        return {
          action: 'merge',
          sessionId: matchedSession.id,
          label,
        };
      }
    }
  }

  return { action: 'create_new', label: null };
}

module.exports = {
  formatTabContent,
  generateSessionLabel,
  handleGroupingRequest,
};
