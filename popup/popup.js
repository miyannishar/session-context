import * as storage from '../utils/storage.js';
import * as sessionizer from '../utils/sessionizer.js';

let sessionsList, emptyState, saveSnapshotBtn, snapshotNameInput, settingsBtn;

async function initialize() {
  sessionsList = document.getElementById('sessionsList');
  emptyState = document.getElementById('emptyState');
  saveSnapshotBtn = document.getElementById('saveSnapshotBtn');
  snapshotNameInput = document.getElementById('snapshotName');
  settingsBtn = document.getElementById('settingsBtn');
  
  saveSnapshotBtn.addEventListener('click', handleSaveSnapshot);
  settingsBtn.addEventListener('click', openSettings);
  
  await loadSessions();
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
      <div class="session-actions">
        <button class="btn btn-success resume-btn" data-session-id="${session.id}">Resume</button>
        <button class="btn btn-danger delete-btn" data-session-id="${session.id}">Delete</button>
      </div>
    </div>
  `;
  
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
    
    window.close();
  } catch (error) {
    console.error('Error resuming session:', error);
    alert('Error resuming session: ' + error.message);
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

document.addEventListener('DOMContentLoaded', initialize);
