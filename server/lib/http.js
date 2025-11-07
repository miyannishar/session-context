const config = require('./config');
const logger = require('./logger');

function isOriginAllowed(origin) {
  if (!origin) {
    return config.allowedOrigins.includes('*');
  }
  if (config.allowedOrigins.includes('*')) {
    return true;
  }
  return config.allowedOrigins.includes(origin);
}

function getAllowedOrigin(origin) {
  if (!origin) {
    return config.allowedOrigins.includes('*') ? '*' : config.allowedOrigins[0];
  }
  if (config.allowedOrigins.includes('*')) {
    return origin;
  }
  return config.allowedOrigins.includes(origin) ? origin : null;
}

function applyCors(res, origin) {
  const allowedOrigin = getAllowedOrigin(origin);
  if (!allowedOrigin) {
    return null;
  }

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin === '*' ? origin || '*' : allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');

  return allowedOrigin === '*' ? origin || '*' : allowedOrigin;
}

function handleOptions(res, origin) {
  const allowed = applyCors(res, origin);
  if (!allowed && origin) {
    res.statusCode = 403;
    res.end(JSON.stringify({ error: 'Origin not allowed by CORS policy' }));
    return;
  }
  res.statusCode = 204;
  res.end();
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';

    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error('Invalid JSON payload'));
      }
    });

    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload, origin) {
  if (origin) {
    applyCors(res, origin);
  }
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin && !config.allowedOrigins.includes('*')) {
      return callback(null, false);
    }
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    logger.error('Blocked by CORS:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};

module.exports = {
  applyCors,
  corsOptions,
  getAllowedOrigin,
  handleOptions,
  readJsonBody,
  sendJson,
  isOriginAllowed,
};
