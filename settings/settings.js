import * as storage from '../utils/storage.js';

let settingsForm, idleThresholdInput, excludedDomainsInput, pauseCaptureInput;
let serverUrlInput, resetBtn, statusMessage;

async function initialize() {
  settingsForm = document.getElementById('settingsForm');
  idleThresholdInput = document.getElementById('idleThreshold');
  excludedDomainsInput = document.getElementById('excludedDomains');
  pauseCaptureInput = document.getElementById('pauseCapture');
  serverUrlInput = document.getElementById('serverUrl');
  resetBtn = document.getElementById('resetBtn');
  statusMessage = document.getElementById('statusMessage');
  
  settingsForm.addEventListener('submit', handleSubmit);
  resetBtn.addEventListener('click', handleReset);
  
  const useLocalServerLink = document.getElementById('useLocalServer');
  if (useLocalServerLink) {
    useLocalServerLink.addEventListener('click', (e) => {
      e.preventDefault();
      serverUrlInput.value = 'http://localhost:3000/api';
      showStatus('Local server URL set. Make sure server is running!', 'success');
      setTimeout(hideStatus, 3000);
    });
  }
  
  await loadSettings();
}

async function loadSettings() {
  try {
    const settings = await storage.loadSettings();
    idleThresholdInput.value = settings.idleThresholdMinutes;
    excludedDomainsInput.value = settings.excludedDomains.join(', ');
    pauseCaptureInput.checked = settings.pauseCapture || false;
    serverUrlInput.value = settings.serverUrl || '';
    
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  
  try {
    const idleThreshold = parseInt(idleThresholdInput.value);
    const excludedDomainsText = excludedDomainsInput.value.trim();
    const pauseCapture = pauseCaptureInput.checked;
    const serverUrl = serverUrlInput.value.trim();
    
    if (isNaN(idleThreshold) || idleThreshold < 1 || idleThreshold > 120) {
      showStatus('Idle threshold must be between 1 and 120 minutes', 'error');
      return;
    }
    
    if (serverUrl) {
      try {
        const url = new URL(serverUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
          showStatus('Server URL must use http:// or https://', 'error');
          return;
        }
      } catch (e) {
        showStatus('Invalid server URL format', 'error');
        return;
      }
    }
    
    const excludedDomains = excludedDomainsText
      .split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);
    
    const settings = {
      idleThresholdMinutes: idleThreshold,
      excludedDomains: excludedDomains,
      pauseCapture: pauseCapture,
      serverUrl: serverUrl
    };
    
    await storage.saveSettings(settings);
    showStatus('Settings saved successfully!', 'success');
    setTimeout(hideStatus, 3000);
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings: ' + error.message, 'error');
  }
}

async function handleReset() {
  if (!confirm('Reset all settings to defaults?')) {
    return;
  }
  
  try {
    const defaults = storage.getDefaultSettings();
    await storage.saveSettings(defaults);
    await loadSettings();
    showStatus('Settings reset to defaults', 'success');
    setTimeout(hideStatus, 3000);
  } catch (error) {
    console.error('Error resetting settings:', error);
    showStatus('Error resetting settings: ' + error.message, 'error');
  }
}

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = 'block';
}

function hideStatus() {
  statusMessage.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', initialize);
