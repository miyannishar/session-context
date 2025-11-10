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

async function startNewSession(suggestedLabel = null) {
  const newSession = storage.createSession();
  
  // If a suggested label is provided, set it immediately
  if (suggestedLabel) {
    newSession.label = suggestedLabel;
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
  if (session && session.tabList && session.tabList.length === 1) {
    const sessionAge = Date.now() - (session.endTs || session.startTs);
    const tenMinutesMs = 10 * 60 * 1000;
    if (sessionAge > tenMinutesMs) {
      await storage.deleteSession(currentSessionId);
      console.log('SessionSwitch: [Background] Deleted single-tab session immediately (older than 10 minutes)', {
        sessionId: currentSessionId,
        age: Math.round(sessionAge / 1000 / 60) + ' minutes'
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

async function findMatchingSession(captureTabObj, settings) {
  const allSessions = await storage.getAllSessions();
  const endedSessions = allSessions.filter(s => s.endTs);
  
  if (endedSessions.length === 0) return null;
  
  let matchingSession = null;
  console.log('SessionSwitch: [Background] findMatchingSession', {
    candidateSessions: endedSessions.length,
    captureTitle: captureTabObj?.title || 'Untitled',
    serverEnabled: Boolean(settings.serverUrl)
  });
  
  if (settings.serverUrl) {
    try {
      const allTabs = await chrome.tabs.query({});
      const decision = await serverAPI.getGroupingDecision(captureTabObj, endedSessions, allTabs);
      console.log('SessionSwitch: [Background] findMatchingSession server decision', decision);

      if (decision && decision.action === 'merge' && decision.sessionId) {
        matchingSession = endedSessions.find(s => s.id === decision.sessionId);
        if (matchingSession) {
          matchingSession._serverDecision = decision;
          console.log('SessionSwitch: [Background] findMatchingSession matched', {
            sessionId: matchingSession.id,
            sessionLabel: matchingSession.label,
            updatedLabel: decision.label || decision.updatedLabel
          });
        }
      } else if (decision && decision.action === 'no_action') {
        console.log('SessionSwitch: [Background] findMatchingSession no action suggested', {
          reason: decision.reason,
          sessionId: decision.sessionId,
          label: decision.label
        });
        captureTabObj._serverNoActionDecision = decision;
        return null;
      } else if (decision && decision.action === 'create_new') {
        console.log('SessionSwitch: [Background] findMatchingSession server recommends new session', {
          suggestedLabel: decision.suggestedLabel
        });
        // Store the server's suggestion on the captureTab object
        captureTabObj._serverCreateNewDecision = decision;
        return null; // Return null to indicate no matching session
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
  
  // Apply the updated label from the server's matcher agent
  // This label reflects both the old session content and the new tab being merged
  if (matchingSession._serverDecision && matchingSession._serverDecision.label) {
    console.log('SessionSwitch: Applying updated label from server:', matchingSession._serverDecision.label);
    await storage.updateSession(matchingSession.id, { 
      label: matchingSession._serverDecision.label 
    });
  } else if (matchingSession._serverDecision && matchingSession._serverDecision.updatedLabel) {
    console.log('SessionSwitch: Applying updatedLabel from server:', matchingSession._serverDecision.updatedLabel);
    await storage.updateSession(matchingSession.id, { 
      label: matchingSession._serverDecision.updatedLabel 
    });
  } else {
    // Fallback: generate a new label if server didn't provide one
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
      console.log('SessionSwitch: [Background] captureTab skipped duplicate', {
        tabId: tab.id,
        url: tab.url
      });
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
    
    if (captureTabObj._serverNoActionDecision) {
      const noActionDecision = captureTabObj._serverNoActionDecision;
      console.log('SessionSwitch: [Background] captureTab skipping due to no_action', {
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
      recentTabCaptures.set(tab.id, { url: tab.url, ts: now });
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
        } else if (captureTabObj._serverNoActionDecision) {
          // If no_action was returned, switch to that session instead of creating new
          const noActionDecision = captureTabObj._serverNoActionDecision;
          console.log('SessionSwitch: [Background] captureTab switching to existing session (no_action after idle)', {
            sessionId: noActionDecision.sessionId,
            label: noActionDecision.label,
            reason: noActionDecision.reason
          });
          if (noActionDecision.sessionId) {
            currentSessionId = noActionDecision.sessionId;
            await storage.setCurrentSessionId(currentSessionId);
          }
          lastCaptureTs = capture.ts;
          lastCaptureUrl = capture.url;
          recentTabCaptures.set(tab.id, { url: tab.url, ts: now });
          return;
        } else {
          // Check if server recommended create_new with a suggested label
          if (captureTabObj._serverCreateNewDecision && captureTabObj._serverCreateNewDecision.suggestedLabel) {
            console.log('SessionSwitch: [Background] captureTab starting new session after idle break with suggested label', {
              suggestedLabel: captureTabObj._serverCreateNewDecision.suggestedLabel
            });
            await startNewSession(captureTabObj._serverCreateNewDecision.suggestedLabel);
          } else {
            console.log('SessionSwitch: [Background] captureTab starting new session after idle break');
            await startNewSession();
          }
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

// Periodic cleanup task: remove single-tab sessions older than 10 minutes
async function cleanupStaleOneTabSessions() {
  try {
    const allSessions = await storage.getAllSessions();
    const now = Date.now();
    const tenMinutesMs = 10 * 60 * 1000;
    let deletedCount = 0;

    for (const session of allSessions) {
      // Only target sessions with exactly 1 tab
      if (session.tabList && session.tabList.length === 1) {
        // Calculate age based on the last update time (endTs or startTs)
        const lastUpdate = session.endTs || session.startTs || now;
        const age = now - lastUpdate;
        
        if (age > tenMinutesMs) {
          await storage.deleteSession(session.id);
          deletedCount++;
          console.log('SessionSwitch: [Background] Cleaned up stale single-tab session', {
            sessionId: session.id,
            label: session.label || '(unlabeled)',
            ageMinutes: Math.round(age / 1000 / 60)
          });
          
          // If this was the current session, clear it
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

// Run cleanup every 5 minutes
setInterval(cleanupStaleOneTabSessions, 5 * 60 * 1000);

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
