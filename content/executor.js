/**
 * Content Script: Action Executor
 * Executes CLICK, TYPE, SUBMIT_FORM, NAVIGATE actions from background.
 */

(function () {
  'use strict';

  function executeAction(action) {
    const type = (action.type || '').toUpperCase();
    if (type === 'NAVIGATE') {
      return { success: false, error: 'NAVIGATE handled by background' };
    }
    if (type === 'CLICK') {
      const el = document.querySelector(action.selector);
      if (!el) throw new Error(`Selector not found: ${action.selector}`);
      el.click();
      return { success: true, action: 'click' };
    }
    if (type === 'TYPE') {
      const el = document.querySelector(action.selector);
      if (!el) throw new Error(`Selector not found: ${action.selector}`);
      el.focus();
      const val = action.value ?? '';
      if (el.isContentEditable) {
        el.textContent = val;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: val }));
      } else {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return { success: true, action: 'type' };
    }
    if (type === 'SUBMIT_FORM') {
      const el = document.querySelector(action.selector) || document.querySelector('form');
      if (!el) throw new Error('Form not found');
      el.submit();
      return { success: true, action: 'submit' };
    }
    throw new Error(`Unknown action type: ${type}`);
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'PING') {
      sendResponse({ ok: true });
      return true;
    }
    if (msg.type !== 'EXECUTE_ACTION') return false;
    try {
      const result = executeAction(msg.action);
      sendResponse({ ok: true, result });
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
    return true;
  });
})();
