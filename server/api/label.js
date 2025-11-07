const { applyCors, handleOptions, readJsonBody, sendJson } = require('../lib/http');
const { generateSessionLabel } = require('../lib/sessionSwitch');
const logger = require('../lib/logger');

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';

  if (req.method === 'OPTIONS') {
    return handleOptions(res, origin);
  }

  const allowed = applyCors(res, origin);
  if (!allowed && origin) {
    return sendJson(res, 403, { error: 'Origin not allowed by CORS policy' });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' }, origin);
  }

  try {
    const body = await readJsonBody(req);
    const { tabList } = body || {};

    if (!Array.isArray(tabList) || tabList.length === 0) {
      return sendJson(res, 400, { error: 'tabList must contain at least one tab' }, origin);
    }

    if (tabList.length > 0) {
      logger.verbose('Vercel label request', {
        tabCount: tabList.length,
        sample: tabList.slice(0, 3).map((tab) => tab.url),
      });
    }

    const label = await generateSessionLabel(tabList);
    if (!label) {
      return sendJson(res, 502, { error: 'Unable to generate label' }, origin);
    }

    return sendJson(res, 200, { label }, origin);
  } catch (error) {
    logger.error('Error in /api/label (vercel):', error);

    return sendJson(res, 500, { error: 'Unable to generate label' }, origin);
  }
};
