const parseNumber = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const rawAllowedOrigins = (process.env.CORS_ALLOW_ORIGINS || 'https://app.sessionswitch.com')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const config = {
  port: parseNumber(process.env.PORT, 3000),
  openAiKey: process.env.OPENAI_API_KEY || '',
  groupingModel: process.env.OPENAI_GROUP_MODEL || 'gpt-4.1',
  labelingModel: process.env.OPENAI_LABEL_MODEL || 'gpt-3.5-turbo',
  rateLimitWindowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMax: parseNumber(process.env.RATE_LIMIT_MAX, 120),
  logRequests: process.env.LOG_REQUESTS !== 'false',
  logVerbose: process.env.LOG_VERBOSE === 'true',
  allowedOrigins: rawAllowedOrigins.length ? rawAllowedOrigins : ['*'],
};

module.exports = config;
