/**
 * Popup script — Settings, session controls, permission dialogs.
 */

(function () {
  'use strict';

  const apiKeyEl = document.getElementById('apiKey');
  const apiUrlEl = document.getElementById('apiUrl');
  const modelEl = document.getElementById('model');
  const userGoalEl = document.getElementById('userGoal');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnStop = document.getElementById('btnStop');
  const btnApprove = document.getElementById('btnApprove');
  const feedEl = document.getElementById('feed');
  const toggleFeed = document.getElementById('toggleFeed');
  const statusBar = document.getElementById('statusBar');
  const permissionSection = document.getElementById('permissionSection');
  const permissionText = document.getElementById('permissionText');
  const btnGrant = document.getElementById('btnGrant');
  const btnDeny = document.getElementById('btnDeny');
  const agentActiveBar = document.getElementById('agentActiveBar');
  const agentActiveText = document.getElementById('agentActiveText');
  const firstVisitBanner = document.getElementById('firstVisitBanner');
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const profilePhone = document.getElementById('profilePhone');
  const btnSaveProfile = document.getElementById('btnSaveProfile');
  const btnSkipProfile = document.getElementById('btnSkipProfile');
  const formChoicesSection = document.getElementById('formChoicesSection');
  const formChoicesList = document.getElementById('formChoicesList');
  const btnFillSelected = document.getElementById('btnFillSelected');
  const btnSkipFill = document.getElementById('btnSkipFill');
  const trustModeEl = document.getElementById('trustMode');
  const autoFillFormsEl = document.getElementById('autoFillForms');
  const autoGoalEl = document.getElementById('autoGoal');

  let pendingFormActions = [];

  async function loadSettings() {
    const s = await chrome.storage.local.get(['llm_api_key', 'llm_api_url', 'llm_model', 'uwa_user_profile', 'uwa_trust_mode', 'uwa_auto_fill_forms', 'uwa_auto_goal']);
    apiKeyEl.value = s.llm_api_key || '';
    apiUrlEl.value = s.llm_api_url || 'https://api.openai.com/v1/chat/completions';
    modelEl.value = s.llm_model || 'gpt-4o-mini';
    const p = s.uwa_user_profile || {};
    if (profileName) profileName.value = p.name || '';
    if (profileEmail) profileEmail.value = p.email || '';
    if (profilePhone) profilePhone.value = p.phone || '';
    if (trustModeEl) trustModeEl.checked = !!s.uwa_trust_mode;
    if (autoFillFormsEl) autoFillFormsEl.checked = !!s.uwa_auto_fill_forms;
    if (autoGoalEl) autoGoalEl.checked = !!s.uwa_auto_goal;
  }

  function setAgentActive(active) {
    if (agentActiveBar) agentActiveBar.classList.toggle('hidden', !active);
  }

  if (btnSaveProfile) {
    btnSaveProfile.addEventListener('click', async () => {
      await chrome.storage.local.set({
        uwa_user_profile: {
          name: profileName?.value?.trim() || '',
          email: profileEmail?.value?.trim() || '',
          phone: profilePhone?.value?.trim() || '',
        },
      });
      firstVisitBanner?.classList.add('hidden');
    });
  }
  if (btnSkipProfile) btnSkipProfile.addEventListener('click', () => firstVisitBanner?.classList.add('hidden'));
  if (btnFillSelected) {
    btnFillSelected.addEventListener('click', async () => {
      const checked = pendingFormActions.map((_, i) => document.getElementById(`formChoice_${i}`)?.checked);
      const profile = (await chrome.storage.local.get('uwa_user_profile')).uwa_user_profile || {};
      const selected = pendingFormActions
        .filter((_, i) => checked[i])
        .map((a) => {
          const label = ((a.label || a.selector || '') + (a.name || '')).toLowerCase();
          let value = a.value;
          if (label.includes('email')) value = profile.email || value;
          else if (label.includes('name') || label.includes('username')) value = profile.name || value;
          else if (label.includes('phone') || label.includes('tel')) value = profile.phone || value;
          return { ...a, value: value || a.value };
        });
      chrome.runtime.sendMessage({ type: 'FORM_CHOICE_SELECTED', selection: selected });
      formChoicesSection?.classList.add('hidden');
      formChoicesList.innerHTML = '';
      pendingFormActions = [];
    });
  }
  if (btnSkipFill) {
    btnSkipFill.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'FORM_CHOICE_SELECTED', selection: [] });
      formChoicesSection?.classList.add('hidden');
      formChoicesList.innerHTML = '';
      pendingFormActions = [];
    });
  }

  async function saveSettings() {
    await chrome.storage.local.set({
      llm_api_key: apiKeyEl.value.trim() || undefined,
      llm_api_url: apiUrlEl.value.trim() || undefined,
      llm_model: modelEl.value.trim() || undefined,
      uwa_trust_mode: trustModeEl?.checked ?? false,
      uwa_auto_fill_forms: autoFillFormsEl?.checked ?? false,
      uwa_auto_goal: autoGoalEl?.checked ? (userGoalEl?.value?.trim() || undefined) : undefined,
    });
  }

  trustModeEl?.addEventListener('change', saveSettings);
  autoFillFormsEl?.addEventListener('change', saveSettings);
  autoGoalEl?.addEventListener('change', () => {
    chrome.storage.local.set({ uwa_auto_goal: autoGoalEl?.checked ? (userGoalEl?.value?.trim() || undefined) : undefined });
  });

  apiKeyEl.addEventListener('blur', saveSettings);
  apiUrlEl.addEventListener('blur', saveSettings);
  modelEl.addEventListener('blur', saveSettings);

  const AGENT_LABELS = {
    decision_initial: '🧠 Decision',
    decision_final: '🧠 Decision',
    navigator: '🧭 Navigator',
    reader: '👁 Reader',
    executor: '✋ Executor',
    permission: '🔐 Permission',
    system: '⚙️ System',
  };

  function setStatus(text) {
    if (statusBar) statusBar.textContent = text;
  }

  function appendFeed(node, msg, data) {
    const item = document.createElement('div');
    item.className = `feed-item ${node}`;
    const ts = new Date().toLocaleTimeString();
    const label = AGENT_LABELS[node] || node;
    
    // Enhanced display for MCP results
    let extra = '';
    if (node === 'mcp' && data) {
      if (data.tool) extra = ` — ${data.tool}`;
      if (data.result) {
        const resultStr = JSON.stringify(data.result, null, 2);
        extra += `\n📦 Result: ${resultStr.substring(0, 200)}${resultStr.length > 200 ? '...' : ''}`;
      }
    } else if (node === 'system' && msg === 'Session complete' && data) {
      // Show summary for session complete
      if (data.success !== undefined && data.total !== undefined) {
        extra = ` — ${data.success}/${data.total} actions succeeded`;
      }
      // Show MCP results if any
      if (data.results && data.results.length > 0) {
        const mcpResults = data.results.filter(r => r.result && !r.error);
        if (mcpResults.length > 0) {
          extra += '\n✅ MCP Tools executed successfully!';
        }
      }
    } else {
      extra = data?.error ? ` — ${data.error}` : 
              (data?.url ? ` — ${data.url}` : '') || 
              (data?.actions ? ` (${data.actions} actions)` : '') || 
              (data?.count ? ` (${data.count})` : '') || '';
    }
    
    item.textContent = `[${ts}] ${label}: ${msg}${extra}`;
    item.style.whiteSpace = 'pre-wrap'; // Allow line breaks for MCP results
    feedEl.appendChild(item);
    feedEl.scrollTop = feedEl.scrollHeight;
    setStatus(`${label}: ${msg}`);
  }

  toggleFeed.addEventListener('click', () => {
    toggleFeed.classList.toggle('open');
    feedEl.classList.toggle('collapsed', !toggleFeed.classList.contains('open'));
  });

  btnStart.addEventListener('click', async () => {
    await saveSettings();
    if (autoGoalEl?.checked) chrome.storage.local.set({ uwa_auto_goal: userGoalEl?.value?.trim() || undefined });
    const goal = userGoalEl.value.trim();
    if (!goal) {
      appendFeed('system', 'error', { error: 'Enter a user goal' });
      return;
    }
    setStatus('Starting...');
    setAgentActive(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: 'START_SESSION', userGoal: goal });
      if (response?.ok) {
        appendFeed('system', 'Session complete', {});
        setStatus('Done');
      } else {
        appendFeed('system', 'error', { error: response?.error || 'Failed' });
        setStatus('Error: ' + (response?.error || 'Failed'));
      }
    } catch (err) {
      appendFeed('system', 'error', { error: err.message });
      setStatus('Error: ' + err.message);
    }
    setAgentActive(false);
  });

  btnPause.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'PAUSE_SESSION' });
    appendFeed('system', 'paused', {});
  });

  btnStop.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'STOP_SESSION' });
    appendFeed('system', 'stopped', {});
  });

  btnApprove.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'APPROVE_ACTION' });
    appendFeed('system', 'approved', {});
  });

  btnGrant.addEventListener('click', async () => {
    permissionSection.style.display = 'none';
    await chrome.runtime.sendMessage({ type: 'APPROVE_ACTION' });
  });

  btnDeny.addEventListener('click', async () => {
    permissionSection.style.display = 'none';
    await chrome.runtime.sendMessage({ type: 'DENY_ACTION' });
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'LOG_FEED') {
      if (msg.node === 'agent' && (msg.msg === 'active' || msg.msg === 'idle')) {
        if (msg.msg === 'active') setAgentActive(true);
        if (msg.msg === 'idle') setAgentActive(false);
      } else if (msg.node === 'agent' && msg.msg === 'form_choices') {
        pendingFormActions = msg.data?.actions || [];
        formChoicesList.innerHTML = '';
        pendingFormActions.forEach((a, i) => {
          const label = a.label || a.selector || `Field ${i + 1}`;
          const div = document.createElement('label');
          div.className = 'form-choice-item';
          div.innerHTML = `<input type="checkbox" id="formChoice_${i}"> ${label}`;
          formChoicesList.appendChild(div);
        });
        formChoicesSection?.classList.remove('hidden');
      } else {
        appendFeed(msg.node, msg.msg, msg.data);
        if (msg.node === 'permission' && msg.msg === 'request') {
          permissionSection.style.display = 'block';
          permissionText.textContent = `Permission required: ${msg.data?.permission || 'unknown'}`;
        }
      }
    }
    if (msg.type === 'FIRST_VISIT') {
      firstVisitBanner?.classList.remove('hidden');
      if (agentActiveText) agentActiveText.textContent = `First visit: ${msg.domain || 'this site'}`;
    }
    if (msg.type === 'PERMISSION_REQUEST') {
      permissionSection.style.display = 'block';
      permissionText.textContent = `Permission required: ${msg.permission || 'unknown'}`;
    }
    if (msg.type === 'TIER_UPGRADE_REQUEST') {
      // Auto-approve tier upgrades for now (can add UI confirmation later)
      appendFeed('tier', `Upgrading to Tier ${msg.requiredTier}`, { reason: msg.reason });
      chrome.runtime.sendMessage({ type: 'TIER_UPGRADE_RESPONSE', approved: true });
    }
  });

  loadSettings();
})();
