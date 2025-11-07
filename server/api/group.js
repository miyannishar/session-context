const config = require('../lib/config');
const { applyCors, handleOptions, readJsonBody, sendJson } = require('../lib/http');
const { handleGroupingRequest } = require('../lib/sessionSwitch');
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

    logger.verbose('Parsed /api/group payload', {
      origin,
      newTab: body?.newTab,
      existingSessions: body?.existingSessions,
      currentTabs: body?.currentTabs,
    });

    const result = await handleGroupingRequest(body);
    return sendJson(res, 200, result, origin);
  } catch (error) {
    logger.error('Error in /api/group (vercel):', error);

    const status = error.message && error.message.includes('JSON') ? 400 : 500;
    const message = status === 400 ? error.message : 'Unable to process grouping request';

    return sendJson(res, status, { error: message }, origin);
  }
};
