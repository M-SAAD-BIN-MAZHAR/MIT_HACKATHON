/**
 * Enhanced Orchestrator v2 — Full Web Agent API implementation
 * Features: MCP integration, memory, voice, capability tiers, cross-site workflows
 */

importScripts(
  'llm/llmClient.js',
  'permissions/permissionManager.js',
  'capabilities/tierManager.js',
  'mcp/mcpClient.js',
  'graph/agentGraph.js',
  'agents/decisionAgent.js',
  'agents/navigatorAgent.js',
  'agents/readerAgent.js',
  'agents/executorAgent.js',
  'agents/retryAgent.js',
  'agents/memoryAgent.js',
  'agents/voiceAgent.js'
);

let sessionState = {
  paused: false,
  stopped: false,
  running: false,
  taskId: null,
  startTime: null,
};

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// Auto-connect to MCP server on startup
(async function initMCP() {
  try {
    const result = await mcpClient.registerServer('demo-mcp', {
      transport: 'http',
      url: 'http://localhost:3001',
    });
    
    if (result.success) {
      console.log('✅ MCP server connected:', result.server);
      const tools = mcpClient.listTools();
      console.log('📦 Available MCP tools:', tools.map((t) => t.name));
    } else {
      console.warn('⚠️ MCP server connection failed:', result.error);
      console.log('💡 Start MCP server: cd mcp && npm start');
    }
  } catch (err) {
    console.warn('⚠️ MCP initialization error:', err.message);
  }
})();

const VISITED_KEY = 'uwa_visited_domains';

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (_) {
    return '';
  }
}

// Track visited domains and trigger first-visit experience
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url?.startsWith('http')) return;
  
  const domain = getDomain(tab.url);
  if (!domain) return;

  const { [VISITED_KEY]: visited = [], uwa_trust_mode: trustMode, uwa_auto_goal: autoGoal } = 
    await chrome.storage.local.get([VISITED_KEY, 'uwa_trust_mode', 'uwa_auto_goal']);

  if (!visited.includes(domain)) {
    await chrome.storage.local.set({ [VISITED_KEY]: [...visited, domain] });
    
    try {
      const { windowId } = await chrome.windows.getCurrent();
      await chrome.sidePanel.open({ windowId });
    } catch (_) {}

    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: 'FIRST_VISIT',
        domain,
        url: tab.url,
      }).catch(() => {});
    }, 500);
  }

  // Auto-start in trust mode
  if (trustMode && autoGoal && typeof autoGoal === 'string' && autoGoal.trim() && !sessionState.running) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id === tabId) {
      setTimeout(() => startSession(autoGoal.trim(), () => {}), 1500);
    }
  }
});

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getDOMFromTab(tabId, waitForJs = true) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'GET_DOM_SNAPSHOT',
      waitForJs,
    });
    return response?.ok ? response.data : null;
  } catch (e) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => ({
          url: window.location.href,
          title: document.title,
          buttons: [],
          links: [],
          forms: [],
          inputs: [],
          important_text: [],
          full_text: '',
          html: document.documentElement.outerHTML.slice(0, 80000),
        }),
      });
      return results?.[0]?.result ?? null;
    } catch (_) {
      return null;
    }
  }
}

async function sendActionToTab(tabId, action) {
  // Try to ping the content script first
  let scriptReady = false;
  try {
    const pingResponse = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    scriptReady = pingResponse?.ok;
  } catch (e) {
    // Content script not ready
  }
  
  // If not ready, inject scripts
  if (!scriptReady) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId, allFrames: false },
        files: ['content/reader.js'],
      });
      await chrome.scripting.executeScript({
        target: { tabId, allFrames: false },
        files: ['content/executor.js'],
      });
      // Wait for scripts to initialize
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error('Failed to inject content scripts:', e);
      throw new Error('Cannot inject content scripts on this page. Try a different website.');
    }
  }
  
  const response = await chrome.tabs.sendMessage(tabId, {
    type: 'EXECUTE_ACTION',
    action,
  });
  if (!response?.ok) throw new Error(response?.error ?? 'Action failed');
  return response.result;
}

// Message handlers
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'START_SESSION') {
    startSession(msg.userGoal, sendResponse).catch((err) => {
      sendResponse({ ok: false, error: err.message });
    });
    return true;
  }
  if (msg.type === 'START_VOICE_SESSION') {
    startVoiceSession(sendResponse).catch((err) => {
      sendResponse({ ok: false, error: err.message });
    });
    return true;
  }
  if (msg.type === 'PAUSE_SESSION') {
    sessionState.paused = true;
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === 'STOP_SESSION') {
    sessionState.stopped = true;
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === 'APPROVE_ACTION') {
    sessionState.pendingApproval?.resolve?.();
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === 'DENY_ACTION') {
    sessionState.pendingApproval?.reject?.(new Error('User denied'));
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === 'LOG_FEED') {
    broadcastLog(msg.node, msg.msg, msg.data);
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === 'FORM_CHOICE_SELECTED') {
    if (sessionState.formChoiceResolve) {
      sessionState.formChoiceResolve(msg.selection);
      sessionState.formChoiceResolve = null;
    }
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === 'MCP_REGISTER_SERVER') {
    mcpClient.registerServer(msg.name, msg.config)
      .then((result) => {
        sendResponse(result);
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
  if (msg.type === 'MCP_CALL_TOOL') {
    mcpClient.callTool(msg.toolName, msg.params, msg.context)
      .then((result) => {
        sendResponse({ ok: true, result });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }
  if (msg.type === 'TIER_UPGRADE_RESPONSE') {
    // Handled by tierManager
    return false;
  }
  return false;
});

function broadcastLog(node, msg, data) {
  chrome.runtime.sendMessage({ type: 'LOG_FEED', node, msg, data }).catch(() => {});
}

/**
 * Start voice-controlled session
 */
async function startVoiceSession(sendResponse) {
  try {
    broadcastLog('voice', 'Listening for command...', {});
    
    // This would be handled in content script with voice agent
    // For now, just acknowledge
    sendResponse({ ok: true, message: 'Voice session started' });
  } catch (err) {
    sendResponse({ ok: false, error: err.message });
  }
}

/**
 * Main session orchestrator with all enhancements
 */
async function startSession(userGoal, sendResponse) {
  if (sessionState.running) return;

  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionState = {
    paused: false,
    stopped: false,
    running: true,
    taskId,
    startTime: Date.now(),
  };

  const tab = await getActiveTab();
  if (!tab?.id) {
    sendResponse({ ok: false, error: 'No active tab' });
    return;
  }

  const opts = await chrome.storage.local.get([
    'llm_api_key',
    'llm_api_url',
    'llm_model',
    'uwa_trust_mode',
    'uwa_auto_fill_forms',
    'uwa_user_profile',
    'uwa_voice_enabled',
    'uwa_memory_enabled',
  ]);

  const trustMode = !!opts.uwa_trust_mode;
  const autoFillForms = !!opts.uwa_auto_fill_forms;
  const voiceEnabled = !!opts.uwa_voice_enabled;
  const memoryEnabled = opts.uwa_memory_enabled !== false; // Default true
  const profile = opts.uwa_user_profile || {};

  const callLLMFn = async (messages, o) => {
    const apiKey = opts.llm_api_key;
    const apiUrl = opts.llm_api_url || 'https://api.openai.com/v1/chat/completions';
    const model = opts.llm_model || 'gpt-4o-mini';
    if (!apiKey) throw new Error('LLM API key not set');
    
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) throw new Error(`LLM error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  };

  let currentTabId = tab.id;
  let currentUrl = tab.url;

  const sendToContent = async (action) => {
    const t = (action.type || '').toUpperCase();
    if (t === 'NAVIGATE' && action.url) {
      await chrome.tabs.update(currentTabId, { url: action.url });
      const waitMs = /chat\.openai\.com|chatgpt\.com/i.test(action.url) ? 8000 : 3500;
      await new Promise((r) => setTimeout(r, waitMs));
      
      // Wait for page to be fully loaded
      const tab = await chrome.tabs.get(currentTabId);
      let attempts = 0;
      while (tab.status !== 'complete' && attempts < 10) {
        await new Promise((r) => setTimeout(r, 500));
        attempts++;
      }
      
      const t2 = await chrome.tabs.get(currentTabId);
      currentUrl = t2.url;
      return { success: true };
    }
    return sendActionToTab(currentTabId, action);
  };

  const injectProfileIntoTypeActions = (actions) => {
    return (actions || []).map((a) => {
      if ((a.type || '').toUpperCase() !== 'TYPE') return a;
      const label = ((a.label || '') + (a.selector || '') + (a.name || '')).toLowerCase();
      let value = a.value;
      if (label.includes('email')) value = profile.email || value;
      else if (label.includes('name') || label.includes('username')) value = profile.name || value;
      else if (label.includes('phone') || label.includes('tel')) value = profile.phone || value;
      return { ...a, value: value || a.value };
    });
  };

  let state = {
    userGoal: userGoal,
    currentUrl: currentUrl,
    tabId: currentTabId,
    taskId: taskId,
    paused: false,
    stopped: false,
    domSnapshot: null,
    pageData: null,
    actions: [],
    requiredPermissions: [],
    memories: [],
    userProfile: profile,
  };

  const checkState = () => {
    state.paused = sessionState.paused;
    state.stopped = sessionState.stopped;
  };

  const checkPermissionAutoApprove = async (perm) => {
    if (trustMode) return true;
    
    const check = await checkPermission(perm, {
      url: state.currentUrl,
      taskId: state.taskId,
    });

    if (check.allowed === true) return true;
    if (check.allowed === false) return false;

    if (check.requiresApproval) {
      sessionState.pendingApproval = {};
      const prom = new Promise((res, rej) => {
        sessionState.pendingApproval.resolve = () =>
          grantPermission(perm, { url: state.currentUrl, taskId: state.taskId }, 'task')
            .then(() => res(true));
        sessionState.pendingApproval.reject = () => res(false);
      });

      broadcastLog('permission', 'request', { permission: perm });

      try {
        return await prom;
      } catch (_) {
        return false;
      }
    }

    return false;
  };

  const MAX_NAV_LOOPS = 5;
  const MAX_RETRIES_PER_ACTION = 5;

  try {
    broadcastLog('agent', 'active', {});

    // Get tier recommendation
    const tierRec = await tierManager.recommendTier(userGoal, callLLMFn);
    broadcastLog('tier', 'Recommended tier', { tier: tierRec.recommended_tier, reason: tierRec.reason });

    // Check if current tier is sufficient
    if (tierManager.getTier().level < tierRec.recommended_tier) {
      const upgraded = await tierManager.requestTierUpgrade(tierRec.recommended_tier, tierRec.reason);
      if (!upgraded) {
        broadcastLog('tier', 'Upgrade denied, continuing with limited capabilities', {});
      }
    }

    // Load memories if enabled
    if (memoryEnabled) {
      broadcastLog('memory', 'Loading context...', {});
      const memAgent = new MemoryAgent();
      const memories = await memAgent.retrieve({
        goal: userGoal,
        url: currentUrl,
        taskId: taskId,
      }, callLLMFn);

      state.memories = memories.relevant_memories || [];
      state.userProfile = { ...state.userProfile, ...memories.user_profile };
      state.memorySuggestions = memories.suggestions || [];

      if (state.memorySuggestions.length > 0) {
        broadcastLog('memory', 'Suggestions', { suggestions: state.memorySuggestions });
      }
    }

    // Main execution loop
    for (let navLoop = 0; navLoop < MAX_NAV_LOOPS && !state.stopped; navLoop++) {
      checkState();
      if (state.stopped) break;

      // Extract page content
      broadcastLog('reader', 'Extracting page content...', {});
      const dom = await getDOMFromTab(currentTabId, true);
      state.domSnapshot = dom?.html ?? JSON.stringify(dom ?? {});
      state.pageData = {
        buttons: dom?.buttons || [],
        forms: dom?.forms || [],
        links: dom?.links || [],
        inputs: dom?.inputs || [],
        important_text: dom?.important_text || [],
        full_text: dom?.full_text || '',
      };
      state.currentUrl = currentUrl;

      broadcastLog('reader', 'Page extracted', {
        buttons: state.pageData.buttons?.length ?? 0,
        forms: state.pageData.forms?.length ?? 0,
        links: state.pageData.links?.length ?? 0,
      });

      // Structure with LLM
      broadcastLog('reader', 'Structuring with LLM...', {});
      const reader = await readerAgent(state, callLLMFn);
      Object.assign(state, reader);
      checkState();

      // Get available MCP tools
      const availableMcpTools = mcpClient.listTools();
      state.mcpTools = availableMcpTools.map((t) => ({
        name: t.name,
        description: t.description,
        server: t.server,
      }));

      // Plan actions
      broadcastLog('decision_final', 'Planning actions...', {});
      const decisionF = await decisionFinal(state, callLLMFn);
      Object.assign(state, decisionF);
      checkState();

      // Check tier restrictions for planned actions
      for (const action of state.actions || []) {
        const tierCheck = await tierManager.checkAction(action, { url: currentUrl });
        if (!tierCheck.allowed) {
          broadcastLog('tier', 'Action blocked', {
            action: action.type,
            reason: tierCheck.reason,
            requiredTier: tierCheck.requiredTier,
          });

          const upgraded = await tierManager.requestTierUpgrade(tierCheck.requiredTier, tierCheck.reason);
          if (!upgraded) {
            state.actions = state.actions.filter((a) => a !== action);
          }
        }
      }

      // Separate navigation from other actions
      const navActions = (state.actions || []).filter((a) => (a.type || '').toUpperCase() === 'NAVIGATE' && a.url);
      const otherActions = (state.actions || []).filter((a) => (a.type || '').toUpperCase() !== 'NAVIGATE');

      if (navActions.length > 0 && otherActions.length === 0) {
        const a = navActions[0];
        broadcastLog('navigator', 'Navigating', { url: a.url });
        await sendToContent(a);
        const t2 = await chrome.tabs.get(currentTabId);
        currentUrl = t2.url;
        continue;
      }

      state.actions = otherActions;
      if (state.actions.length === 0) break;

      // Handle form filling
      const typeActions = state.actions.filter((a) => (a.type || '').toUpperCase() === 'TYPE');
      if (typeActions.length > 0) {
        if (trustMode || autoFillForms) {
          state.actions = injectProfileIntoTypeActions(state.actions);
        } else {
          broadcastLog('agent', 'form_choices', {
            actions: typeActions,
            forms: state.pageData?.forms || [],
          });

          const choice = await new Promise((res) => {
            sessionState.formChoiceResolve = res;
          });

          if (choice && Array.isArray(choice) && choice.length > 0) {
            state.actions = state.actions.filter((a) => (a.type || '').toUpperCase() !== 'TYPE');
            state.actions = state.actions.concat(injectProfileIntoTypeActions(choice));
          } else {
            state.actions = state.actions.filter((a) => (a.type || '').toUpperCase() !== 'TYPE');
          }
        }
      }

      // Check permissions
      for (const p of (state.requiredPermissions || [])) {
        const ok = await checkPermissionAutoApprove(p);
        if (!ok) {
          state.stopped = true;
          break;
        }
      }
      if (state.stopped) break;

      // Execute actions
      broadcastLog('executor', 'Executing', { count: state.actions?.length ?? 0 });

      const execTabId = currentTabId;
      const results = [];

      for (let i = 0; i < state.actions.length && !state.stopped; i++) {
        let action = state.actions[i];
        let lastError = null;
        let tries = 0;

        while (tries < MAX_RETRIES_PER_ACTION && !state.stopped) {
          try {
            broadcastLog('executor', 'Executing', {
              type: action.type,
              selector: action.selector,
              tool: action.tool,
            });

            let result;
            const actionType = (action.type || '').toUpperCase();
            
            if (actionType === 'NAVIGATE' && action.url) {
              result = await sendToContent(action);
            } else {
              // All other actions go through content script
              result = await sendActionToTab(execTabId, action);
            }

            results.push({ action, result, index: i });
            broadcastLog('executor', 'Done', { type: action.type });
            break;
          } catch (err) {
            lastError = err;
            broadcastLog('executor', 'Failed, retrying...', { error: err.message });
            tries++;

            if (tries >= MAX_RETRIES_PER_ACTION) {
              results.push({ action, error: err.message, index: i });
              break;
            }

            const alt = await retryAgent(action, err.message, state, callLLMFn);
            if (!alt) break;
            action = alt;
          }
        }
      }

      state.executionResults = results;
      break;
    }

    // Store successful workflow in memory
    if (memoryEnabled && !state.stopped) {
      const memAgent = new MemoryAgent();
      await memAgent.learnWorkflow({
        goal: userGoal,
        steps: state.actions || [],
        outcome: 'success',
        duration: Date.now() - sessionState.startTime,
        success: true,
        url: currentUrl,
      });
    }

    // Log tier usage
    await tierManager.logUsage();

    // Broadcast completion with summary
    const successCount = state.executionResults?.filter(r => !r.error).length || 0;
    const totalCount = state.executionResults?.length || 0;
    broadcastLog('system', 'Session complete', { 
      success: successCount, 
      total: totalCount,
      results: state.executionResults 
    });
    broadcastLog('agent', 'idle', {});
    sendResponse({ ok: true, state });
  } catch (err) {
    broadcastLog('agent', 'idle', {});
    sendResponse({ ok: false, error: err.message });
  } finally {
    sessionState.running = false;
    
    // Expire task-scoped permissions
    await expireTaskPermissions(taskId);
  }
}

