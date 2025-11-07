import * as storage from './storage.js';

const DEFAULT_SERVER_URL = 'http://localhost:3000/api';

async function getServerUrl() {
  try {
    const result = await chrome.storage.local.get('settings');
    const settings = result.settings || {};
    return settings.serverUrl || DEFAULT_SERVER_URL;
  } catch (error) {
    console.error('SessionSwitch: Error getting server URL', error);
    return DEFAULT_SERVER_URL;
  }
}

export async function getGroupingDecision(newTab, existingSessions, allCurrentTabs = null) {
  try {
    const serverUrl = await getServerUrl();
    const endpoint = `${serverUrl}/group`;

    let currentTabs = allCurrentTabs;
    if (!currentTabs) {
      try {
        currentTabs = await chrome.tabs.query({});
        currentTabs = currentTabs
          .filter(t => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://'))
          .map(t => ({
            url: t.url,
            title: t.title || 'Untitled',
            active: t.active,
            windowId: t.windowId,
            favIconUrl: t.favIconUrl || null
          }));
      } catch (error) {
        console.log('SessionSwitch: Could not get current tabs', error);
        currentTabs = [];
      }
    }

    const requestData = {
      newTab: {
        url: newTab.url,
        title: newTab.title || 'Untitled',
        ts: newTab.ts || Date.now(),
        favicon: newTab.favicon || null,
        content: newTab.content || null
      },
      currentTabs: currentTabs || [],
      existingSessions: existingSessions.map(session => ({
        id: session.id,
        label: session.label || null,
        startTs: session.startTs,
        endTs: session.endTs,
        tabList: session.tabList.map(tab => ({
          url: tab.url,
          title: tab.title || 'Untitled',
          ts: tab.ts || null,
          favicon: tab.favicon || null,
          content: tab.content || null
        }))
      }))
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`
      }));
      console.error('SessionSwitch: Server error for grouping', {
        status: response.status,
        statusText: response.statusText,
        error: error
      });
      return null;
    }

    const result = await response.json();
    
    if (!result.action || !['merge', 'create_new'].includes(result.action)) {
      console.error('SessionSwitch: Invalid response format from server', result);
      return null;
    }

    return result;

  } catch (error) {
    console.error('SessionSwitch: Error calling server for grouping', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return null;
  }
}

export async function generateSessionLabel(tabList) {
  try {
    const serverUrl = await getServerUrl();
    const endpoint = `${serverUrl}/label`;

    const requestData = {
      tabList: tabList.map(tab => ({
        url: tab.url,
        title: tab.title || 'Untitled',
        ts: tab.ts || null,
        favicon: tab.favicon || null,
        content: tab.content || null
      }))
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`
      }));
      console.error('SessionSwitch: Server error for labeling', {
        status: response.status,
        statusText: response.statusText,
        error: error
      });
      return null;
    }

    const result = await response.json();
    
    if (!result.label || typeof result.label !== 'string') {
      console.error('SessionSwitch: Invalid response format from server', result);
      return null;
    }

    return result.label.trim();

  } catch (error) {
    console.error('SessionSwitch: Error calling server for labeling', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return null;
  }
}

export async function checkServerHealth() {
  try {
    const serverUrl = await getServerUrl();
    const endpoint = `${serverUrl}/health`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const result = await response.json();
    return {
      success: true,
      message: result.message || 'Server is healthy'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
