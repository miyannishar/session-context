import * as storage from './utils/storage.js';
import * as sessionizer from './utils/sessionizer.js';
import * as contentExtractor from './utils/contentExtractor.js';
import * as serverAPI from './utils/serverAPI.js';
import { TIME_CONSTANTS, SESSION_CONFIG, SERVER_ACTIONS, EXCLUDED_URL_PREFIXES } from './utils/constants.js';

let currentSessionId = null;
let lastCaptureTs = null;
let lastCaptureUrl = null;
const recentTabCaptures = new Map();

async function initialize() {
  currentSessionId = await storage.getCurrentSessionId();
  chrome.idle.setDetectionInterval(TIME_CONSTANTS.IDLE_DETECTION_INTERVAL_SECONDS);
  
  await cleanupSessions();
  
  if (!currentSessionId) {
    await startNewSession();
  }
}

async function cleanupSessions() {
  try {
    const deletedSingle = await storage.cleanupSingleTabSessions();
    const deletedExpired = await storage.cleanupExpiredSessions();
    if (deletedSingle > 0 || deletedExpired > 0) {
      console.log('SessionSwitch: Session cleanup summary', {
        removedSingleTabSessions: deletedSingle,
        removedExpiredSessions: deletedExpired
      });
    }
  } catch (error) {
    console.error('SessionSwitch: Error cleaning up sessions', error);
  }
}

async function startNewSession(suggestedLabel = null) {
  const newSession = storage.createSession(suggestedLabel);
  
  if (suggestedLabel) {
    console.log('SessionSwitch: [Background] startNewSession with label', {
      sessionId: newSession.id,
      label: suggestedLabel
    });
  }
  
  await storage.addSession(newSession);
  currentSessionId = newSession.id;
  await storage.setCurrentSessionId(currentSessionId);
}

async function labelSession(sessionId, forceReLabel = false) {
  if (!sessionId) return null;
  
  const sessions = await storage.getAllSessions();
  const session = sessions.find(s => s.id === sessionId);
  console.log('SessionSwitch: [Background] labelSession invoked', {
    sessionId,
    forceReLabel,
    sessionFound: Boolean(session),
    tabCount: session?.tabList?.length || 0
  });
  
  if (!session || session.tabList.length === 0) {
    console.log('SessionSwitch: [Background] labelSession skipped - no tabs');
    return null;
  }
  
  if (session.label && !forceReLabel) {
    console.log('SessionSwitch: [Background] labelSession using existing label', {
      sessionId,
      label: session.label
    });
    return session.label;
  }
  
  const settings = await storage.loadSettings();
  let label = null;
  console.log('SessionSwitch: [Background] labelSession requesting server label', {
    sessionId,
    useServer: Boolean(settings.serverUrl)
  });

  if (settings.serverUrl) {
    label = await serverAPI.generateSessionLabel(session.tabList);
  }

  if (label) {
    await storage.updateSession(sessionId, { label: label });
    console.log('SessionSwitch: [Background] labelSession updated label from server', {
      sessionId,
      label
    });
    return label;
  }
  
  console.log('SessionSwitch: [Background] labelSession no label produced');
  return null;
}

async function endCurrentSession() {
  if (!currentSessionId) return;
  
  await labelSession(currentSessionId);
  await storage.updateSession(currentSessionId, {
    endTs: Date.now()
  });
  
  const session = (await storage.getAllSessions()).find(s => s.id === currentSessionId);
  if (session?.tabList?.length === 1) {
    const sessionAge = Date.now() - (session.endTs || session.startTs);
    if (sessionAge > TIME_CONSTANTS.TEN_MINUTES_MS) {
      await storage.deleteSession(currentSessionId);
      console.log('SessionSwitch: [Background] Deleted single-tab session immediately', {
        sessionId: currentSessionId,
        ageMinutes: Math.round(sessionAge / 60000)
      });
      currentSessionId = null;
      await storage.setCurrentSessionId(null);
      return;
    }
  }
  
  currentSessionId = null;
  await storage.setCurrentSessionId(null);
  
  await cleanupSessions();
}

function handleServerDecision(decision, captureTabObj, endedSessions) {
  if (!decision) return null;

  const { action, sessionId, suggestedLabel, label, updatedLabel, reason } = decision;

  if (action === SERVER_ACTIONS.MERGE && sessionId) {
    const matchingSession = endedSessions.find(s => s.id === sessionId);
    if (matchingSession) {
      matchingSession._serverDecision = decision;
      console.log('SessionSwitch: [Background] Server matched session', {
        sessionId: matchingSession.id,
        sessionLabel: matchingSession.label,
        updatedLabel: label || updatedLabel
      });
      return matchingSession;
    }
  } else if (action === SERVER_ACTIONS.NO_ACTION) {
    console.log('SessionSwitch: [Background] Server suggests no action', {
      reason, sessionId, label
    });
    captureTabObj._serverNoActionDecision = decision;
  } else if (action === SERVER_ACTIONS.CREATE_NEW) {
    console.log('SessionSwitch: [Background] Server recommends new session', { suggestedLabel });
    captureTabObj._serverCreateNewDecision = decision;
  }

  return null;
}

async function findMatchingSession(captureTabObj, settings) {
  const allSessions = await storage.getAllSessions();
  const endedSessions = allSessions.filter(s => s.endTs);
  
  if (endedSessions.length === 0) return null;
  
  console.log('SessionSwitch: [Background] findMatchingSession', {
    candidateSessions: endedSessions.length,
    captureTitle: captureTabObj?.title || 'Untitled',
    serverEnabled: Boolean(settings.serverUrl)
  });
  
  if (settings.serverUrl) {
    try {
      const allTabs = await chrome.tabs.query({});
      const decision = await serverAPI.getGroupingDecision(captureTabObj, endedSessions, allTabs);
      console.log('SessionSwitch: [Background] Server decision', decision);
      return handleServerDecision(decision, captureTabObj, endedSessions);
    } catch (error) {
      console.error('SessionSwitch: Server matching failed', error);
    }
  }
  
  return null;
}

async function mergeIntoSession(matchingSession, captureTabObj) {
  const sessions = await storage.getAllSessions();
  const freshSession = sessions.find(s => s.id === matchingSession.id);
  if (!freshSession) return false;
  
  console.log('SessionSwitch: [Background] mergeIntoSession', {
    sessionId: matchingSession.id,
    previousTabCount: freshSession.tabList.length,
    newTabTitle: captureTabObj.title
  });
  
  const updatedTabList = [...freshSession.tabList, captureTabObj];
  
  await storage.updateSession(matchingSession.id, {
    tabList: updatedTabList,
    endTs: null,
    startTs: Math.min(freshSession.startTs, captureTabObj.ts)
  });
  
  const serverLabel = matchingSession._serverDecision?.label || matchingSession._serverDecision?.updatedLabel;
  if (serverLabel) {
    console.log('SessionSwitch: Applying updated label from server:', serverLabel);
    await storage.updateSession(matchingSession.id, { label: serverLabel });
  } else {
    await labelSession(matchingSession.id, true);
  }
  
  delete matchingSession._serverDecision;
  currentSessionId = matchingSession.id;
  await storage.setCurrentSessionId(currentSessionId);
  
  console.log('SessionSwitch: [Background] mergeIntoSession completed', {
    sessionId: matchingSession.id,
    totalTabs: updatedTabList.length
  });
  
  return true;
}

function shouldSkipTab(tab, settings) {
  if (!tab?.url) return true;
  if (settings.pauseCapture) return true;
  if (EXCLUDED_URL_PREFIXES.some(prefix => tab.url.startsWith(prefix))) return true;
  if (sessionizer.isDomainExcluded(tab.url, settings.excludedDomains)) return true;
  
  const recentCapture = recentTabCaptures.get(tab.id);
  if (recentCapture?.url === tab.url && 
      (Date.now() - recentCapture.ts) < TIME_CONSTANTS.DUPLICATE_THRESHOLD_MS) {
    console.log('SessionSwitch: [Background] Skipped duplicate capture', { tabId: tab.id, url: tab.url });
    return true;
  }
  
  return false;
}

async function handleNoActionDecision(captureTabObj, tab, capture) {
  const noActionDecision = captureTabObj._serverNoActionDecision;
  if (!noActionDecision) return false;
  
  console.log('SessionSwitch: [Background] No action required', {
    reason: noActionDecision.reason,
    sessionId: noActionDecision.sessionId,
    label: noActionDecision.label
  });
  
  if (noActionDecision.sessionId) {
    currentSessionId = noActionDecision.sessionId;
    await storage.setCurrentSessionId(currentSessionId);
  }
  
  lastCaptureTs = capture.ts;
  lastCaptureUrl = capture.url;
  recentTabCaptures.set(tab.id, { url: tab.url, ts: Date.now() });
  return true;
}

async function captureTab(tab) {
  try {
    const settings = await storage.loadSettings();
    
    if (shouldSkipTab(tab, settings)) return;
    
    let pageContent = null;
    try {
      pageContent = await contentExtractor.extractTabContent(tab.id);
    } catch (error) {
      // Continue without content if extraction fails
    }
    
    const capture = storage.createTabCapture(
      tab.url,
      tab.title || 'Untitled',
      tab.favIconUrl || null,
      tab.windowId,
      tab.id,
      pageContent
    );
    
    const captureTabObj = {
      url: capture.url,
      title: capture.title,
      ts: capture.ts,
      favicon: capture.favicon,
      content: capture.content
    };
    
    if (!currentSessionId) {
      const matchingSession = await findMatchingSession(captureTabObj, settings);
      
      if (matchingSession) {
        console.log('SessionSwitch: [Background] captureTab merging into session', {
          sessionId: matchingSession.id,
          sessionLabel: matchingSession.label
        });
        await mergeIntoSession(matchingSession, captureTabObj);
        lastCaptureTs = capture.ts;
        lastCaptureUrl = capture.url;
        return;
      }
    }
    
    if (await handleNoActionDecision(captureTabObj, tab, capture)) {
      return;
    }

    if (lastCaptureTs && lastCaptureUrl) {
      const lastCapture = {
        ts: lastCaptureTs,
        url: lastCaptureUrl
      };
      
      if (sessionizer.shouldStartNewSession(lastCapture, capture, settings.idleThresholdMinutes)) {
        await endCurrentSession();
        
        const matchingSession = await findMatchingSession(captureTabObj, settings);
        
        if (matchingSession) {
          console.log('SessionSwitch: [Background] captureTab merging after idle break', {
            sessionId: matchingSession.id,
            sessionLabel: matchingSession.label
          });
          await mergeIntoSession(matchingSession, captureTabObj);
          lastCaptureTs = capture.ts;
          lastCaptureUrl = capture.url;
          return;
        } else if (await handleNoActionDecision(captureTabObj, tab, capture)) {
          return;
        } else {
          const suggestedLabel = captureTabObj._serverCreateNewDecision?.suggestedLabel;
          if (suggestedLabel) {
            console.log('SessionSwitch: [Background] Starting new session with suggested label', { suggestedLabel });
          } else {
            console.log('SessionSwitch: [Background] Starting new session after idle break');
          }
          await startNewSession(suggestedLabel);
        }
      }
    }
    
    if (!currentSessionId) {
      console.log('SessionSwitch: [Background] captureTab starting new session (no active session)');
      await startNewSession();
    }
    
    if (currentSessionId) {
      const session = (await storage.getAllSessions()).find(s => s.id === currentSessionId);
      if (session) {
        const updatedTabList = [...session.tabList, captureTabObj];
        await storage.updateSession(currentSessionId, {
          tabList: updatedTabList,
          endTs: null
        });
        console.log('SessionSwitch: [Background] captureTab added tab to session', {
          sessionId: currentSessionId,
          tabCount: updatedTabList.length,
          tabTitle: captureTabObj.title
        });
        
        const updatedSession = (await storage.getAllSessions()).find(s => s.id === currentSessionId);
        if (updatedSession && !updatedSession.label && updatedSession.tabList.length >= 2) {
          console.log('SessionSwitch: [Background] captureTab triggering labelSession', {
            sessionId: currentSessionId,
            tabCount: updatedSession.tabList.length
          });
          await labelSession(currentSessionId);
        }
      }
    }
    
    lastCaptureTs = capture.ts;
    lastCaptureUrl = capture.url;
    recentTabCaptures.set(tab.id, { url: tab.url, ts: now });
  } catch (error) {
    console.error('SessionSwitch: Error capturing tab', error);
  }
}

async function onTabActivated(activeInfo) {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await captureTab(tab);
  } catch (error) {
    console.error('SessionSwitch: Error on tab activated', error);
  }
}

async function onTabUpdated(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.id === tabId) {
      await captureTab(tab);
    }
  }
}

async function onIdleStateChanged(state) {
  if (state === 'idle' || state === 'locked') {
    await endCurrentSession();
  } else if (state === 'active') {
    if (!currentSessionId) {
      await startNewSession();
    }
  }
}

chrome.tabs.onActivated.addListener(onTabActivated);
chrome.tabs.onUpdated.addListener(onTabUpdated);
chrome.idle.onStateChanged.addListener(onIdleStateChanged);
chrome.tabs.onRemoved.addListener((tabId) => {
  recentTabCaptures.delete(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'sessionswitch:clearSessions') {
    storage.setCurrentSessionId(null).finally(() => {
      currentSessionId = null;
      lastCaptureTs = null;
      lastCaptureUrl = null;
      recentTabCaptures.clear();
      sendResponse({ ok: true });
    });
    return true;
  }
  return undefined;
});

async function cleanupStaleOneTabSessions() {
  try {
    const allSessions = await storage.getAllSessions();
    const now = Date.now();
    let deletedCount = 0;

    for (const session of allSessions) {
      if (session.tabList?.length === 1) {
        const lastUpdate = session.endTs || session.startTs || now;
        const age = now - lastUpdate;
        
        if (age > TIME_CONSTANTS.TEN_MINUTES_MS) {
          await storage.deleteSession(session.id);
          deletedCount++;
          console.log('SessionSwitch: [Background] Cleaned up stale single-tab session', {
            sessionId: session.id,
            label: session.label || '(unlabeled)',
            ageMinutes: Math.round(age / 60000)
          });
          
          if (session.id === currentSessionId) {
            currentSessionId = null;
            await storage.setCurrentSessionId(null);
          }
        }
      }
    }
    
    if (deletedCount > 0) {
      console.log(`SessionSwitch: [Background] Cleanup completed: removed ${deletedCount} stale session(s)`);
    }
  } catch (error) {
    console.error('SessionSwitch: [Background] Error during session cleanup', error);
  }
}

setInterval(cleanupStaleOneTabSessions, TIME_CONSTANTS.CLEANUP_INTERVAL_MS);

chrome.runtime.onInstalled.addListener(async (details) => {
  await initialize();
  // Run initial cleanup on install/update
  await cleanupStaleOneTabSessions();
});

chrome.runtime.onStartup.addListener(async () => {
  await initialize();
  // Run initial cleanup on startup
  await cleanupStaleOneTabSessions();
});

initialize();
