import * as storage from './storage.js';
import { SERVER_CONFIG, SERVER_ACTIONS } from './constants.js';

async function getServerUrl() {
  try {
    const settings = await storage.loadSettings();
    return settings.serverUrl || SERVER_CONFIG.DEFAULT_URL;
  } catch (error) {
    console.error('SessionSwitch: Error getting server URL', error);
    return SERVER_CONFIG.DEFAULT_URL;
  }
}

export async function getGroupingDecision(newTab, existingSessions, allCurrentTabs = null) {
  try {
    const serverUrl = await getServerUrl();
    const endpoint = `${serverUrl}/group`;

    console.log('SessionSwitch: [ServerAPI] Preparing /group request', {
      endpoint,
      newTabTitle: newTab?.title || 'Untitled',
      existingSessionCount: existingSessions?.length || 0,
      sampleExistingLabels: (existingSessions || []).slice(0, 3).map(s => s.label || 'Unnamed')
    });

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

    console.log('SessionSwitch: [ServerAPI] Sent /group request', {
      requestSizeBytes: JSON.stringify(requestData).length,
      endpoint
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

    const responseData = await response.json();
    
    // Handle new ADK backend response format: { result: { action, sessionId, updatedLabel, suggestedLabel } }
    const result = responseData.result || responseData;
    console.log('SessionSwitch: [ServerAPI] Received /group response', {
      action: result?.action,
      sessionId: result?.sessionId,
      updatedLabel: result?.updatedLabel,
      suggestedLabel: result?.suggestedLabel,
      label: result?.label,
      reason: result?.reason
    });
    
    if (result.action) {
      result.action = String(result.action).trim();
      if (result.action === 'new') {
        result.action = SERVER_ACTIONS.CREATE_NEW;
      }
    }

    const validActions = Object.values(SERVER_ACTIONS);
    if (!result.action || !validActions.includes(result.action)) {
      console.error('SessionSwitch: Invalid response format from server', result);
      return null;
    }

    if (result.action === SERVER_ACTIONS.MERGE && result.updatedLabel) {
      result.label = result.updatedLabel;
    }

    if (result.action === SERVER_ACTIONS.NO_ACTION) {
      if (!result.label && result.updatedLabel) {
        result.label = result.updatedLabel;
      }
      console.log('SessionSwitch: [ServerAPI] No action required', {
        sessionId: result.sessionId,
        label: result.label,
        reason: result.reason
      });
    }

    return result;

  } catch (error) {
    console.error('SessionSwitch: Error calling server for grouping', error.message, error);
    return null;
  }
}

export async function generateSessionLabel(tabList) {
  try {
    const serverUrl = await getServerUrl();
    const endpoint = `${serverUrl}/label`;

    console.log('SessionSwitch: [ServerAPI] Preparing /label request', {
      endpoint,
      tabCount: tabList?.length || 0,
      sampleTitles: (tabList || []).slice(0, 3).map(tab => tab.title || 'Untitled')
    });

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

    console.log('SessionSwitch: [ServerAPI] Sent /label request', {
      requestSizeBytes: JSON.stringify(requestData).length,
      endpoint
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
    console.log('SessionSwitch: [ServerAPI] Received /label response', result);
    
    if (!result.label || typeof result.label !== 'string') {
      console.error('SessionSwitch: Invalid response format from server', result);
      return null;
    }

    return result.label.trim();

  } catch (error) {
    console.error('SessionSwitch: Error calling server for labeling', error.message, error);
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
