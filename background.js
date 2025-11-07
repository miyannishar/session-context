import * as storage from './utils/storage.js';
import * as sessionizer from './utils/sessionizer.js';
import * as contentExtractor from './utils/contentExtractor.js';
import * as serverAPI from './utils/serverAPI.js';

let currentSessionId = null;
let lastCaptureTs = null;
let lastCaptureUrl = null;
const recentTabCaptures = new Map();

async function initialize() {
  currentSessionId = await storage.getCurrentSessionId();
  chrome.idle.setDetectionInterval(15);
  
  await cleanupSessions();
  
  if (!currentSessionId) {
    await startNewSession();
  }
}

async function cleanupSessions() {
  try {
    const deletedSingle = await storage.cleanupSingleTabSessions(5/60);
    const deletedExpired = await storage.cleanupExpiredSessions(24);
    if (deletedSingle > 0 || deletedExpired > 0) {
      console.log('SessionSwitch: Session cleanup summary', {
        removedSingleTabSessions: deletedSingle,
        removedExpiredSessions: deletedExpired
      });
    }
  } catch (error) {
    console.error('SessionSwitch: Error cleaning up single-tab sessions', error);
  }
}

async function startNewSession() {
  const newSession = storage.createSession();
  await storage.addSession(newSession);
  currentSessionId = newSession.id;
  await storage.setCurrentSessionId(currentSessionId);
}

async function labelSession(sessionId, forceReLabel = false) {
  if (!sessionId) return null;
  
  const sessions = await storage.getAllSessions();
  const session = sessions.find(s => s.id === sessionId);
  
  if (!session || session.tabList.length === 0) {
    return null;
  }
  
  if (session.label && !forceReLabel) {
    return session.label;
  }
  
  const settings = await storage.loadSettings();
  let label = null;

  if (settings.serverUrl) {
    label = await serverAPI.generateSessionLabel(session.tabList);
  }

  if (label) {
    await storage.updateSession(sessionId, { label: label });
    return label;
  }
  
  return null;
}

async function endCurrentSession() {
  if (!currentSessionId) return;
  
  await labelSession(currentSessionId);
  await storage.updateSession(currentSessionId, {
    endTs: Date.now()
  });
  
  const session = (await storage.getAllSessions()).find(s => s.id === currentSessionId);
  if (session && session.tabList && session.tabList.length === 1) {
    const sessionAge = Date.now() - (session.endTs || session.startTs);
    const fiveMinutesMs = 5 * 60 * 1000;
    if (sessionAge > fiveMinutesMs) {
      await storage.deleteSession(currentSessionId);
      console.log('SessionSwitch: Deleted single-tab session immediately (older than 5 minutes)');
      currentSessionId = null;
      await storage.setCurrentSessionId(null);
      return;
    }
  }
  
  currentSessionId = null;
  await storage.setCurrentSessionId(null);
  
  await cleanupSessions();
}

async function findMatchingSession(captureTabObj, settings) {
  const allSessions = await storage.getAllSessions();
  const endedSessions = allSessions.filter(s => s.endTs);
  
  if (endedSessions.length === 0) return null;
  
  let matchingSession = null;
  
  if (settings.serverUrl) {
    try {
      const allTabs = await chrome.tabs.query({});
      const decision = await serverAPI.getGroupingDecision(captureTabObj, endedSessions, allTabs);

      if (decision && decision.action === 'merge' && decision.sessionId) {
        matchingSession = endedSessions.find(s => s.id === decision.sessionId);
        if (matchingSession) {
          matchingSession._serverDecision = decision;
        }
      }
    } catch (error) {
      console.error('SessionSwitch: Server matching failed', error);
    }
  }
  
  return matchingSession;
}

async function mergeIntoSession(matchingSession, captureTabObj) {
  const sessions = await storage.getAllSessions();
  const freshSession = sessions.find(s => s.id === matchingSession.id);
  if (!freshSession) return false;
  
  const updatedTabList = [...freshSession.tabList, captureTabObj];
  
  await storage.updateSession(matchingSession.id, {
    tabList: updatedTabList,
    endTs: null,
    startTs: Math.min(freshSession.startTs, captureTabObj.ts)
  });
  
  if (matchingSession._serverDecision && matchingSession._serverDecision.label) {
    await storage.updateSession(matchingSession.id, { 
      label: matchingSession._serverDecision.label 
    });
  } else {
    await labelSession(matchingSession.id, true);
  }
  
  delete matchingSession._serverDecision;
  currentSessionId = matchingSession.id;
  await storage.setCurrentSessionId(currentSessionId);
  
  return true;
}

async function captureTab(tab) {
  try {
    const settings = await storage.loadSettings();
    
    if (settings.pauseCapture) {
      return;
    }
    
    if (!tab || !tab.url) return;
    
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return;
    }
    
    if (sessionizer.isDomainExcluded(tab.url, settings.excludedDomains)) {
      return;
    }

    const now = Date.now();
    const recentCapture = recentTabCaptures.get(tab.id);
    const duplicateThresholdMs = 2 * 60 * 1000;
    if (recentCapture && recentCapture.url === tab.url && (now - recentCapture.ts) < duplicateThresholdMs) {
      return;
    }
    
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
        await mergeIntoSession(matchingSession, captureTabObj);
        lastCaptureTs = capture.ts;
        lastCaptureUrl = capture.url;
        return;
      }
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
          await mergeIntoSession(matchingSession, captureTabObj);
          lastCaptureTs = capture.ts;
          lastCaptureUrl = capture.url;
          return;
        } else {
          await startNewSession();
        }
      }
    }
    
    if (!currentSessionId) {
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
        
        const updatedSession = (await storage.getAllSessions()).find(s => s.id === currentSessionId);
        if (updatedSession && !updatedSession.label && updatedSession.tabList.length >= 2) {
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

chrome.runtime.onActivated.addListener(onTabActivated);
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

chrome.runtime.onInstalled.addListener(async (details) => {
  await initialize();
});

chrome.runtime.onStartup.addListener(async () => {
  await initialize();
});

initialize();
