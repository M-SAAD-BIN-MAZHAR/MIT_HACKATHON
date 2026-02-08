/**
 * Settings Page Script
 * Manages all configuration options for the Web Agent API
 */

(async function () {
  'use strict';

  // Load settings on page load
  await loadSettings();
  await loadStatistics();

  // LLM Configuration
  document.getElementById('apiKey').addEventListener('blur', saveSettings);
  document.getElementById('apiUrl').addEventListener('blur', saveSettings);
  document.getElementById('model').addEventListener('change', saveSettings);

  // Tier Selection
  document.querySelectorAll('.tier-card').forEach((card) => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.tier-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      const tier = parseInt(card.dataset.tier);
      chrome.storage.local.set({ uwa_capability_tier: tier });
    });
  });

  // Feature Toggles
  document.getElementById('trustMode').addEventListener('change', saveSettings);
  document.getElementById('autoFillForms').addEventListener('change', saveSettings);
  document.getElementById('voiceEnabled').addEventListener('change', saveSettings);
  document.getElementById('memoryEnabled').addEventListener('change', saveSettings);

  // Profile
  document.getElementById('profileName').addEventListener('blur', saveProfile);
  document.getElementById('profileEmail').addEventListener('blur', saveProfile);
  document.getElementById('profilePhone').addEventListener('blur', saveProfile);

  // Memory Management
  document.getElementById('exportMemory').addEventListener('click', exportMemory);
  document.getElementById('importMemory').addEventListener('click', importMemory);
  document.getElementById('clearMemory').addEventListener('click', clearMemory);

  // Audit Log
  document.getElementById('viewAuditLog').addEventListener('click', viewAuditLog);
  document.getElementById('exportAuditLog').addEventListener('click', exportAuditLog);
  document.getElementById('clearAuditLog').addEventListener('click', clearAuditLog);

  // Save/Reset
  document.getElementById('saveSettings').addEventListener('click', () => {
    saveSettings();
    showAlert('Settings saved successfully!', 'success');
  });

  document.getElementById('resetSettings').addEventListener('click', resetSettings);

  async function loadSettings() {
    const settings = await chrome.storage.local.get([
      'llm_api_key',
      'llm_api_url',
      'llm_model',
      'uwa_capability_tier',
      'uwa_trust_mode',
      'uwa_auto_fill_forms',
      'uwa_voice_enabled',
      'uwa_memory_enabled',
      'uwa_user_profile',
    ]);

    document.getElementById('apiKey').value = settings.llm_api_key || '';
    document.getElementById('apiUrl').value = settings.llm_api_url || 'https://api.openai.com/v1/chat/completions';
    document.getElementById('model').value = settings.llm_model || 'gpt-4o-mini';

    const tier = settings.uwa_capability_tier || 2;
    document.querySelectorAll('.tier-card').forEach((card) => {
      if (parseInt(card.dataset.tier) === tier) {
        card.classList.add('active');
      }
    });

    document.getElementById('trustMode').checked = !!settings.uwa_trust_mode;
    document.getElementById('autoFillForms').checked = !!settings.uwa_auto_fill_forms;
    document.getElementById('voiceEnabled').checked = !!settings.uwa_voice_enabled;
    document.getElementById('memoryEnabled').checked = settings.uwa_memory_enabled !== false;

    const profile = settings.uwa_user_profile || {};
    document.getElementById('profileName').value = profile.name || '';
    document.getElementById('profileEmail').value = profile.email || '';
    document.getElementById('profilePhone').value = profile.phone || '';
  }

  async function saveSettings() {
    await chrome.storage.local.set({
      llm_api_key: document.getElementById('apiKey').value.trim() || undefined,
      llm_api_url: document.getElementById('apiUrl').value.trim() || undefined,
      llm_model: document.getElementById('model').value || 'gpt-4o-mini',
      uwa_trust_mode: document.getElementById('trustMode').checked,
      uwa_auto_fill_forms: document.getElementById('autoFillForms').checked,
      uwa_voice_enabled: document.getElementById('voiceEnabled').checked,
      uwa_memory_enabled: document.getElementById('memoryEnabled').checked,
    });
  }

  async function saveProfile() {
    await chrome.storage.local.set({
      uwa_user_profile: {
        name: document.getElementById('profileName').value.trim(),
        email: document.getElementById('profileEmail').value.trim(),
        phone: document.getElementById('profilePhone').value.trim(),
      },
    });
  }

  async function loadStatistics() {
    // Memory stats
    const memoryData = await chrome.storage.local.get('uwa_memory');
    const memory = memoryData.uwa_memory || { memories: [], profile: {} };
    
    const workflows = memory.memories.filter((m) => m.type === 'workflow').length;
    const preferences = memory.memories.filter((m) => m.type === 'preference').length;
    
    document.getElementById('memoryCount').textContent = memory.memories.length;
    document.getElementById('workflowCount').textContent = workflows;
    document.getElementById('preferenceCount').textContent = preferences;

    // Audit stats
    const auditData = await chrome.storage.local.get('mcp_audit_log');
    const auditLog = auditData.mcp_audit_log || [];
    
    const actions = auditLog.filter((l) => l.type === 'tool_call').length;
    const permissions = auditLog.filter((l) => l.type === 'permission_grant').length;
    const toolCalls = auditLog.filter((l) => l.type === 'tool_call').length;
    
    document.getElementById('actionCount').textContent = actions;
    document.getElementById('permissionCount').textContent = permissions;
    document.getElementById('toolCallCount').textContent = toolCalls;
  }

  async function exportMemory() {
    const data = await chrome.storage.local.get('uwa_memory');
    const memory = data.uwa_memory || { memories: [], profile: {} };
    
    const blob = new Blob([JSON.stringify(memory, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `web-agent-memory-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showAlert('Memory exported successfully!', 'success');
  }

  async function importMemory() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        
        const current = await chrome.storage.local.get('uwa_memory');
        const memory = current.uwa_memory || { memories: [], profile: {} };
        
        // Merge memories
        const existingIds = new Set(memory.memories.map((m) => m.id));
        const newMemories = imported.memories.filter((m) => !existingIds.has(m.id));
        
        memory.memories = [...memory.memories, ...newMemories];
        memory.profile = { ...memory.profile, ...imported.profile };
        
        await chrome.storage.local.set({ uwa_memory: memory });
        await loadStatistics();
        
        showAlert(`Imported ${newMemories.length} new memories!`, 'success');
      } catch (err) {
        showAlert(`Import failed: ${err.message}`, 'warning');
      }
    };
    
    input.click();
  }

  async function clearMemory() {
    if (!confirm('Are you sure you want to clear all memory? This cannot be undone.')) {
      return;
    }
    
    await chrome.storage.local.set({
      uwa_memory: {
        memories: [],
        profile: {},
        version: 1,
      },
    });
    
    await loadStatistics();
    showAlert('Memory cleared successfully!', 'success');
  }

  async function viewAuditLog() {
    const data = await chrome.storage.local.get('mcp_audit_log');
    const auditLog = data.mcp_audit_log || [];
    
    const logWindow = window.open('', 'Audit Log', 'width=800,height=600');
    logWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Audit Log</title>
        <style>
          body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
          .entry { margin-bottom: 16px; padding: 12px; background: #2d2d2d; border-radius: 4px; }
          .timestamp { color: #569cd6; }
          .type { color: #4ec9b0; font-weight: bold; }
          .error { color: #f48771; }
        </style>
      </head>
      <body>
        <h1>Audit Log (${auditLog.length} entries)</h1>
        ${auditLog.map((entry) => `
          <div class="entry">
            <span class="timestamp">${new Date(entry.timestamp).toLocaleString()}</span>
            <span class="type">[${entry.type}]</span>
            ${entry.tool ? `Tool: ${entry.tool}` : ''}
            ${entry.error ? `<span class="error">Error: ${entry.error}</span>` : ''}
          </div>
        `).join('')}
      </body>
      </html>
    `);
  }

  async function exportAuditLog() {
    const data = await chrome.storage.local.get('mcp_audit_log');
    const auditLog = data.mcp_audit_log || [];
    
    const blob = new Blob([JSON.stringify(auditLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `web-agent-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showAlert('Audit log exported successfully!', 'success');
  }

  async function clearAuditLog() {
    if (!confirm('Are you sure you want to clear the audit log?')) {
      return;
    }
    
    await chrome.storage.local.set({ mcp_audit_log: [] });
    await loadStatistics();
    showAlert('Audit log cleared successfully!', 'success');
  }

  async function resetSettings() {
    if (!confirm('Reset all settings to defaults? Your API key and profile will be preserved.')) {
      return;
    }
    
    const current = await chrome.storage.local.get(['llm_api_key', 'uwa_user_profile']);
    
    await chrome.storage.local.clear();
    await chrome.storage.local.set({
      llm_api_key: current.llm_api_key,
      uwa_user_profile: current.uwa_user_profile,
      llm_api_url: 'https://api.openai.com/v1/chat/completions',
      llm_model: 'gpt-4o-mini',
      uwa_capability_tier: 2,
      uwa_memory_enabled: true,
    });
    
    await loadSettings();
    await loadStatistics();
    showAlert('Settings reset to defaults!', 'success');
  }

  function showAlert(message, type = 'success') {
    const alert = document.getElementById('saveAlert');
    alert.textContent = message;
    alert.className = `alert alert-${type}`;
    alert.classList.remove('hidden');
    
    setTimeout(() => {
      alert.classList.add('hidden');
    }, 3000);
  }
})();
