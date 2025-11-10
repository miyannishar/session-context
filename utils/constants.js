export const TIME_CONSTANTS = {
  DUPLICATE_THRESHOLD_MS: 2 * 60 * 1000,
  TEN_MINUTES_MS: 10 * 60 * 1000,
  FIVE_MINUTES_MS: 5 * 60 * 1000,
  IDLE_DETECTION_INTERVAL_SECONDS: 15,
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000
};

export const STORAGE_KEYS = {
  SESSIONS: 'sessions',
  EVENTS: 'events',
  SETTINGS: 'settings',
  CURRENT_SESSION_ID: 'currentSessionId'
};

export const SERVER_CONFIG = {
  DEFAULT_URL: 'https://session-context.onrender.com/api',
  ENDPOINTS: {
    GROUP: '/group',
    LABEL: '/label',
    HEALTH: '/health'
  }
};

export const SESSION_CONFIG = {
  DEFAULT_IDLE_THRESHOLD_MINUTES: 12,
  SINGLE_TAB_CLEANUP_MINUTES: 10,
  SESSION_EXPIRY_HOURS: 24,
  MIN_TABS_FOR_AUTO_LABEL: 2
};

export const CONTENT_EXTRACTION = {
  MAX_VISIBLE_TEXT_LENGTH: 500,
  MAX_HEADERS: 10,
  MAX_H2_ELEMENTS: 5,
  MAX_HEADER_LENGTH: 200
};

export const SERVER_ACTIONS = {
  MERGE: 'merge',
  CREATE_NEW: 'create_new',
  NO_ACTION: 'no_action'
};

export const EXCLUDED_URL_PREFIXES = [
  'chrome://',
  'chrome-extension://'
];

