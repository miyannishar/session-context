const config = require('../lib/config');
const { applyCors, handleOptions, sendJson } = require('../lib/http');

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';

  if (req.method === 'OPTIONS') {
    return handleOptions(res, origin);
  }

  const allowed = applyCors(res, origin);
  if (!allowed && origin) {
    return sendJson(res, 403, { error: 'Origin not allowed by CORS policy' });
  }

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method Not Allowed' }, origin);
  }

  return sendJson(
    res,
    200,
    {
      status: 'ok',
      message: 'Server is running',
      model_grouping: config.groupingModel,
      model_label: config.labelingModel,
    },
    origin
  );
};
