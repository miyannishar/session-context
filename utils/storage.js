import { STORAGE_KEYS, SESSION_CONFIG, SERVER_CONFIG, RESUME_MODES } from './constants.js';

export function getDefaultSettings() {
  return {
    idleThresholdMinutes: SESSION_CONFIG.DEFAULT_IDLE_THRESHOLD_MINUTES,
    excludedDomains: [],
    pauseCapture: false,
    serverUrl: SERVER_CONFIG.DEFAULT_URL
  };
}

export async function loadSettings() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return result[STORAGE_KEYS.SETTINGS] || getDefaultSettings();
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
}

export async function getAllSessions() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SESSIONS);
  return result[STORAGE_KEYS.SESSIONS] || [];
}

export async function saveSessions(sessions) {
  await chrome.storage.local.set({ [STORAGE_KEYS.SESSIONS]: sessions });
}

export async function addSession(session) {
  const sessions = await getAllSessions();
  sessions.push(session);
  await saveSessions(sessions);
  return session;
}

export async function updateSession(sessionId, updates) {
  const sessions = await getAllSessions();
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    sessions[index] = { ...sessions[index], ...updates };
    await saveSessions(sessions);
    return sessions[index];
  }
  return null;
}

export async function deleteSession(sessionId) {
  const sessions = await getAllSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);
  await saveSessions(filtered);
}

export async function getCurrentSessionId() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CURRENT_SESSION_ID);
  return result[STORAGE_KEYS.CURRENT_SESSION_ID] || null;
}

export async function setCurrentSessionId(sessionId) {
  await chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_SESSION_ID]: sessionId });
}

export function createSession(label = null) {
  return {
    id: generateId(),
    startTs: Date.now(),
    endTs: null,
    label: label,
    tabList: []
  };
}

export function createTabCapture(url, title, favicon = null, windowId = null, tabId = null, content = null) {
  return {
    id: generateId(),
    ts: Date.now(),
    url: url,
    title: title,
    favicon: favicon,
    windowId: windowId,
    tabId: tabId,
    content: content
  };
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export async function getSortedSessions() {
  const sessions = await getAllSessions();
  return sessions.sort((a, b) => {
    const aEnd = a.endTs || a.startTs;
    const bEnd = b.endTs || b.startTs;
    return bEnd - aEnd;
  });
}

export async function cleanupSingleTabSessions(maxAgeHours = SESSION_CONFIG.SINGLE_TAB_CLEANUP_MINUTES / 60) {
  const sessions = await getAllSessions();
  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  
  const sessionsToDelete = sessions.filter(session => {
    return session.endTs && 
           session.tabList?.length === 1 && 
           (now - session.endTs) > maxAgeMs;
  });
  
  if (sessionsToDelete.length > 0) {
    const sessionIdsToDelete = new Set(sessionsToDelete.map(s => s.id));
    const remainingSessions = sessions.filter(s => !sessionIdsToDelete.has(s.id));
    await saveSessions(remainingSessions);
    return sessionsToDelete.length;
  }
  
  return 0;
}

export async function cleanupExpiredSessions(maxAgeHours = SESSION_CONFIG.SESSION_EXPIRY_HOURS) {
  const sessions = await getAllSessions();
  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

  const remainingSessions = sessions.filter(session => {
    const lastActivity = session.endTs || session.startTs;
    return !lastActivity || (now - lastActivity <= maxAgeMs);
  });

  const deletedCount = sessions.length - remainingSessions.length;
  if (deletedCount > 0) {
    await saveSessions(remainingSessions);
  }

  return deletedCount;
}

export async function clearSessions() {
  await saveSessions([]);
  await setCurrentSessionId(null);
}

export async function getResumePreference() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.RESUME_PREFERENCE);
  return result[STORAGE_KEYS.RESUME_PREFERENCE] || RESUME_MODES.NEW_WINDOW;
}

export async function setResumePreference(mode) {
  if (!Object.values(RESUME_MODES).includes(mode)) {
    throw new Error(`Invalid resume mode: ${mode}`);
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.RESUME_PREFERENCE]: mode });
}
