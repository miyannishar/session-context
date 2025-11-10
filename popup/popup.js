import * as storage from '../utils/storage.js';
import * as sessionizer from '../utils/sessionizer.js';
import { RESUME_MODES } from '../utils/constants.js';

let sessionsList,
  emptyState,
  saveSnapshotBtn,
  snapshotNameInput,
  settingsBtn,
  deleteAllSessionsBtn,
  resumeModeButtons,
  resumeHintLabel;
let resumeMode = RESUME_MODES.NEW_WINDOW;

async function initialize() {
  sessionsList = document.getElementById('sessionsList');
  emptyState = document.getElementById('emptyState');
  saveSnapshotBtn = document.getElementById('saveSnapshotBtn');
  snapshotNameInput = document.getElementById('snapshotName');
  settingsBtn = document.getElementById('settingsBtn');
  deleteAllSessionsBtn = document.getElementById('deleteAllSessionsBtn');
  resumeModeButtons = document.querySelectorAll('[data-resume-mode]');
  resumeHintLabel = document.getElementById('resumeModeHint');
  
  saveSnapshotBtn.addEventListener('click', handleSaveSnapshot);
  settingsBtn.addEventListener('click', openSettings);
  if (deleteAllSessionsBtn) {
    deleteAllSessionsBtn.addEventListener('click', handleDeleteAllSessions);
  }

  if (resumeModeButtons.length > 0) {
    resumeMode = await storage.getResumePreference();
    updateResumeToggleUI();
    resumeModeButtons.forEach(btn =>
      btn.addEventListener('click', (event) => handleResumeModeChange(event.currentTarget.dataset.resumeMode))
    );
  }
  
  await loadSessions();
}

function updateResumeToggleUI() {
  if (resumeModeButtons.length > 0) {
    const toggleGroup = resumeModeButtons[0].parentElement;
    if (toggleGroup) {
      const thumbLeft = resumeMode === RESUME_MODES.NEW_WINDOW ? 'calc(50% + 4px)' : '4px';
      toggleGroup.style.setProperty('--thumb-left', thumbLeft);
    }
  }

  resumeModeButtons.forEach((btn) => {
    const isActive = btn.dataset.resumeMode === resumeMode;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  if (resumeHintLabel) {
    resumeHintLabel.textContent =
      resumeMode === RESUME_MODES.CURRENT_WINDOW ? 'Will reopen tabs in this window' : 'Will launch tabs in a new window';
  }
}

async function handleResumeModeChange(mode) {
  if (!mode || mode === resumeMode) {
    return;
  }

  try {
    await storage.setResumePreference(mode);
    resumeMode = mode;
    updateResumeToggleUI();
  } catch (error) {
    console.error('Error saving resume preference:', error);
  }
}

async function loadSessions() {
  try {
    const sessions = await storage.getSortedSessions();
    const validSessions = sessions.filter(s => s.tabList && s.tabList.length > 0);
    
    if (validSessions.length === 0) {
      sessionsList.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }
    
    sessionsList.style.display = 'block';
    emptyState.style.display = 'none';
    sessionsList.innerHTML = '';
    
    validSessions.forEach(session => {
      sessionsList.appendChild(createSessionElement(session));
    });
  } catch (error) {
    console.error('Error loading sessions:', error);
    sessionsList.innerHTML = '<div class="loading">Error loading sessions</div>';
  }
}

function createSessionElement(session) {
  const div = document.createElement('div');
  div.className = 'session-item';
  
  const uniqueTabs = sessionizer.deduplicateTabs(session.tabList);
  const timeSpan = formatTimeSpan(session.startTs, session.endTs || session.startTs);
  const label = session.label || 'Unnamed Session';
  
  div.innerHTML = `
    <div class="session-header">
      <div class="session-info">
        <div class="session-label">${escapeHtml(label)}</div>
        <div class="session-meta">
          <div class="session-meta-item">${timeSpan}</div>
          <div class="session-meta-item">${uniqueTabs.length} tab${uniqueTabs.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
    </div>
    <div class="session-actions">
      <div class="session-actions-row">
        <button class="btn btn-success resume-btn" data-session-id="${session.id}">Resume</button>
        <button class="btn btn-danger delete-btn" data-session-id="${session.id}">Delete</button>
      </div>
      <button class="btn btn-neutral group-btn" data-session-id="${session.id}">Group Tabs</button>
    </div>
  `;
  
  div.querySelector('.group-btn').addEventListener('click', () => handleGroupSession(session.id));
  div.querySelector('.resume-btn').addEventListener('click', () => handleResumeSession(session.id));
  div.querySelector('.delete-btn').addEventListener('click', () => handleDeleteSession(session.id));
  
  return div;
}

function formatTimeSpan(startTs, endTs) {
  const start = new Date(startTs);
  const end = new Date(endTs);
  
  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  const sameDay = start.toDateString() === end.toDateString();
  
  if (sameDay) {
    return `${formatTime(start)} – ${formatTime(end)}`;
  } else {
    const formatDate = (date) => {
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${month}/${day} ${formatTime(date)}`;
    };
    return `${formatDate(start)} – ${formatDate(end)}`;
  }
}

async function handleResumeSession(sessionId) {
  try {
    const sessions = await storage.getAllSessions();
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session || !session.tabList || session.tabList.length === 0) {
      alert('Session has no tabs to resume');
      return;
    }
    
    const uniqueTabs = sessionizer.deduplicateTabs(session.tabList);
    const urls = [...new Set(uniqueTabs.map(tab => tab.url))];

    if (resumeMode === RESUME_MODES.CURRENT_WINDOW) {
      await openTabsInCurrentWindow(urls);
    } else {
      await openTabsInNewWindow(urls);
    }

    window.close();
  } catch (error) {
    console.error('Error resuming session:', error);
    alert('Error resuming session: ' + error.message);
  }
}

async function handleGroupSession(sessionId) {
  try {
    const sessions = await storage.getAllSessions();
    const session = sessions.find(s => s.id === sessionId);

    if (!session || !session.tabList || session.tabList.length === 0) {
      alert('Session has no tabs to group');
      return;
    }

    const uniqueTabs = sessionizer.deduplicateTabs(session.tabList);
    const urls = [...new Set(uniqueTabs.map(tab => tab.url))];

    const currentWindow = await chrome.windows.getCurrent({ populate: false });
    const existingTabs = await chrome.tabs.query({ windowId: currentWindow.id });
    const tabsToGroup = [];
    const usedTabIds = new Set();

    const normalizeUrl = (url) => {
      try {
        const parsed = new URL(url);
        parsed.hash = '';
        if (parsed.pathname.endsWith('/')) {
          parsed.pathname = parsed.pathname.slice(0, -1);
        }
        return parsed.toString();
      } catch {
        return url;
      }
    };

    for (let i = 0; i < urls.length; i++) {
      const targetUrl = urls[i];
      const normalizedTarget = normalizeUrl(targetUrl);
      let matchedTab = existingTabs.find(
        (tab) => !usedTabIds.has(tab.id) && normalizeUrl(tab.url || '') === normalizedTarget
      );

      if (!matchedTab) {
        matchedTab = await chrome.tabs.create({
          windowId: currentWindow.id,
          url: targetUrl,
          active: tabsToGroup.length === 0
        });
      } else if (tabsToGroup.length === 0) {
        await chrome.tabs.update(matchedTab.id, { active: true });
      }

      usedTabIds.add(matchedTab.id);
      tabsToGroup.push(matchedTab.id);
    }

    if (tabsToGroup.length === 0) {
      alert('No tabs available to group');
      return;
    }

    const groupId = await chrome.tabs.group({
      tabIds: tabsToGroup,
      createProperties: { windowId: currentWindow.id }
    });

    const groupTitle = session.label || 'Session';
    if (chrome.tabGroups && chrome.tabGroups.update) {
      await chrome.tabGroups.update(groupId, { title: groupTitle, color: 'blue' });
    }
  } catch (error) {
    console.error('Error creating tab group:', error);
    alert('Error creating tab group: ' + error.message);
  }
}

async function handleDeleteSession(sessionId) {
  if (!confirm('Are you sure you want to delete this session?')) {
    return;
  }
  
  try {
    await storage.deleteSession(sessionId);
    await loadSessions();
  } catch (error) {
    console.error('Error deleting session:', error);
    alert('Error deleting session: ' + error.message);
  }
}

async function handleDeleteAllSessions() {
  if (!confirm('Delete all saved sessions?')) {
    return;
  }

  try {
    deleteAllSessionsBtn.disabled = true;
    deleteAllSessionsBtn.textContent = 'Clearing…';

    await storage.clearSessions();
    try {
      await chrome.runtime.sendMessage({ type: 'sessionswitch:clearSessions' });
    } catch (error) {
      console.warn('SessionSwitch: Unable to notify background about session clear', error);
    }

    await loadSessions();
  } catch (error) {
    console.error('Error clearing sessions:', error);
    alert('Error clearing sessions: ' + error.message);
  } finally {
    deleteAllSessionsBtn.disabled = false;
    deleteAllSessionsBtn.textContent = 'Delete All';
  }
}

async function handleSaveSnapshot() {
  try {
    const label = snapshotNameInput.value.trim() || null;
    const tabs = await chrome.tabs.query({ currentWindow: true });
    
    if (tabs.length === 0) {
      alert('No tabs to save');
      return;
    }
    
    const snapshot = storage.createSession(label);
    
    tabs.forEach(tab => {
      if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        snapshot.tabList.push({
          url: tab.url,
          title: tab.title || 'Untitled',
          ts: Date.now(),
          favicon: tab.favIconUrl || null
        });
      }
    });
    
    snapshot.endTs = Date.now();
    await storage.addSession(snapshot);
    snapshotNameInput.value = '';
    await loadSessions();
    
    const originalText = saveSnapshotBtn.textContent;
    saveSnapshotBtn.textContent = 'Saved!';
    saveSnapshotBtn.disabled = true;
    setTimeout(() => {
      saveSnapshotBtn.textContent = originalText;
      saveSnapshotBtn.disabled = false;
    }, 2000);
  } catch (error) {
    console.error('Error saving snapshot:', error);
    alert('Error saving snapshot: ' + error.message);
  }
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function openTabsInNewWindow(urls) {
  const newWindow = await chrome.windows.create({
    url: urls[0],
    focused: true
  });

  for (let i = 1; i < urls.length; i++) {
    await chrome.tabs.create({
      windowId: newWindow.id,
      url: urls[i],
      active: false
    });
  }
}

async function openTabsInCurrentWindow(urls) {
  const currentWindow = await chrome.windows.getCurrent({ populate: false });
  const existingTabs = await chrome.tabs.query({ windowId: currentWindow.id });
  const usedTabIds = new Set();

  const normalizeUrl = (url) => {
    try {
      const parsed = new URL(url);
      parsed.hash = '';
      if (parsed.pathname.endsWith('/')) {
        parsed.pathname = parsed.pathname.slice(0, -1);
      }
      return parsed.toString();
    } catch {
      return url;
    }
  };

  let firstTabActivated = false;

  for (const targetUrl of urls) {
    const normalizedTarget = normalizeUrl(targetUrl);
    let matchedTab = existingTabs.find(
      (tab) => !usedTabIds.has(tab.id) && normalizeUrl(tab.url || '') === normalizedTarget
    );

    if (matchedTab) {
      if (!firstTabActivated) {
        await chrome.tabs.update(matchedTab.id, { active: true });
        firstTabActivated = true;
      }
      usedTabIds.add(matchedTab.id);
    } else {
      const createdTab = await chrome.tabs.create({
        windowId: currentWindow.id,
        url: targetUrl,
        active: !firstTabActivated
      });
      usedTabIds.add(createdTab.id);
      firstTabActivated = true;
    }
  }
}

document.addEventListener('DOMContentLoaded', initialize);
