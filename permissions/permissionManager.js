/**
 * Permission Manager
 * Handles READ_PAGE (auto), OPEN_TAB (ask once), FILL_FORM (confirm), SUBMIT_ACTION (always confirm).
 * Supports approve once, approve always, deny, revoke, task-based expiry.
 */

const UWA_PERM = {
  READ_PAGE: 'READ_PAGE',
  OPEN_TAB: 'OPEN_TAB',
  FILL_FORM: 'FILL_FORM',
  SUBMIT_ACTION: 'SUBMIT_ACTION',
  MCP_TOOL_CALL: 'MCP_TOOL_CALL',
};

const STORAGE_KEY = 'uwa_permissions';

async function loadPermissions() {
  const { [STORAGE_KEY]: data } = await chrome.storage.local.get(STORAGE_KEY);
  return data ?? { rules: [], taskGrants: {} };
}

async function savePermissions(data) {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

async function checkPermission(type, context = {}) {
  // Check trust mode first - auto-approve everything
  const { uwa_trust_mode: trustMode } = await chrome.storage.local.get('uwa_trust_mode');
  if (trustMode) {
    return { allowed: true, reason: 'trust_mode' };
  }

  const data = await loadPermissions();
  const { rules, taskGrants } = data;
  const taskId = context.taskId ?? 'default';

  if (type === UWA_PERM.READ_PAGE) {
    return { allowed: true, reason: 'auto' };
  }

  const matchingRule = rules.find(
    (r) =>
      r.type === type &&
      (r.pattern ? new RegExp(r.pattern).test(context.url ?? '') : true)
  );

  if (matchingRule?.action === 'deny') return { allowed: false, reason: 'denied' };
  if (matchingRule?.action === 'always') return { allowed: true, reason: 'always' };
  if (matchingRule?.action === 'once') {
    const key = `${type}:${context.url ?? '*'}`;
    if (taskGrants[key]) return { allowed: true, reason: 'once' };
  }

  if (type === UWA_PERM.OPEN_TAB) {
    return { allowed: null, reason: 'ask_once', requiresApproval: true };
  }
  if (type === UWA_PERM.FILL_FORM) {
    return { allowed: null, reason: 'confirm', requiresApproval: true };
  }
  if (type === UWA_PERM.SUBMIT_ACTION) {
    return { allowed: null, reason: 'always_confirm', requiresApproval: true };
  }
  if (type === UWA_PERM.MCP_TOOL_CALL) {
    return { allowed: null, reason: 'confirm', requiresApproval: true };
  }

  return { allowed: null, reason: 'unknown', requiresApproval: true };
}

async function grantPermission(type, context, mode = 'once') {
  const data = await loadPermissions();
  const url = context.url ?? '*';
  const key = `${type}:${url}`;

  if (mode === 'always') {
    data.rules = data.rules.filter((r) => !(r.type === type && r.pattern === url));
    data.rules.push({ type, pattern: url, action: 'always' });
  } else {
    data.taskGrants[key] = Date.now();
    const existing = data.rules.find((r) => r.type === type && r.pattern === url);
    if (!existing) {
      data.rules.push({ type, pattern: url, action: 'once' });
    }
  }
  await savePermissions(data);
  return { allowed: true };
}

async function denyPermission(type, context) {
  const data = await loadPermissions();
  const url = context.url ?? '*';
  data.rules = data.rules.filter((r) => !(r.type === type && r.pattern === url));
  data.rules.push({ type, pattern: url, action: 'deny' });
  await savePermissions(data);
  return { allowed: false };
}

async function revokePermission(type, context) {
  const data = await loadPermissions();
  const url = context.url ?? '*';
  data.rules = data.rules.filter((r) => !(r.type === type && (r.pattern === url || r.pattern === '*')));
  const key = `${type}:${url}`;
  delete data.taskGrants[key];
  await savePermissions(data);
  return { revoked: true };
}

async function expireTaskPermissions(taskId) {
  const data = await loadPermissions();
  const cutoff = Date.now() - 3600000;
  for (const k of Object.keys(data.taskGrants)) {
    if (data.taskGrants[k] < cutoff) delete data.taskGrants[k];
  }
  await savePermissions(data);
}
