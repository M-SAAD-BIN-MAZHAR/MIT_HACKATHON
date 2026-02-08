/**
 * Execution Panel — Live activity feed for agents.
 * Shows: Decision Agent, Navigator Agent, Reader Agent, Executor Agent.
 * Controls: Pause AI, Stop Execution, Approve Action.
 * (Controls and feed are in popup.html/popup.js; this file provides agent-specific formatting.)
 */

(function () {
  'use strict';

  const AGENT_LABELS = {
    decision_initial: '🧠 Decision Agent',
    decision_final: '🧠 Decision Agent',
    navigator: '🧭 Navigator Agent',
    reader: '👁 Reader Agent',
    executor: '✋ Executor Agent',
    permission: '🔐 Permission',
    system: '⚙️ System',
  };

  function getAgentLabel(node) {
    return AGENT_LABELS[node] || node;
  }

  window.UWA_getAgentLabel = getAgentLabel;
})();
