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

const config = require('./lib/config');
const { corsOptions } = require('./lib/http');
const logger = require('./lib/logger');
const { handleGroupingRequest, generateSessionLabel } = require('./lib/sessionSwitch');

if (!config.openAiKey) {
  logger.error('OPENAI_API_KEY is not set. Add it to your environment or .env file.');
  process.exit(1);
}

const app = express();

app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));

if (config.logRequests) {
  app.use(morgan('combined'));
}

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

app.use('/api/', limiter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    model_grouping: config.groupingModel,
    model_label: config.labelingModel,
  });
});

app.post('/api/group', async (req, res) => {
  try {
    const result = await handleGroupingRequest(req.body);
    res.json(result);
  } catch (error) {
    logger.error('Error in /api/group (express):', error);
    const status = error.message && error.message.includes('required') ? 400 : 500;
    const message = status === 400 ? error.message : 'Unable to process grouping request';
    res.status(status).json({ error: message });
  }
});

app.post('/api/label', async (req, res) => {
  try {
    const { tabList } = req.body || {};
    if (!Array.isArray(tabList) || tabList.length === 0) {
      return res.status(400).json({ error: 'tabList must contain at least one tab' });
    }

    const label = await generateSessionLabel(tabList);
    if (!label) {
      return res.status(502).json({ error: 'Unable to generate label' });
    }

    res.json({ label });
  } catch (error) {
    logger.error('Error in /api/label (express):', error);
    res.status(500).json({ error: 'Unable to generate label' });
  }
});

app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed by CORS policy' });
  }

  logger.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  logger.info('\n✅ SessionSwitch server running on port', config.port);
  logger.info('   Grouping model :', config.groupingModel);
  logger.info('   Label model    :', config.labelingModel);
  logger.info('   Rate limit     :', `${config.rateLimitMax} requests / ${config.rateLimitWindowMs / 1000}s`);
  logger.info('   CORS origins   :', config.allowedOrigins.join(', '));
});

