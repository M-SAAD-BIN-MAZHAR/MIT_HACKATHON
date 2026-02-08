/**
 * Content Script: Action Executor
 * Executes CLICK, TYPE, SUBMIT_FORM, NAVIGATE actions from background.
 */

(function () {
  'use strict';

  function isElementVisible(el) {
    if (!el || el.nodeType !== 1) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function findElement(selector) {
    // Try exact selector first
    let el = document.querySelector(selector);
    if (el && isElementVisible(el)) return el;

    // Fallback strategies for common patterns
    const lower = (selector || '').toLowerCase();
    
    // For textarea / input - try all text inputs and contenteditable
    if (lower.includes('textarea') || lower.includes('input') || lower.includes('contenteditable')) {
      el = document.querySelector('#prompt-textarea');
      if (el && isElementVisible(el)) return el;
      el = document.querySelector('textarea');
      if (el && isElementVisible(el)) return el;
      // ChatGPT and similar: contenteditable divs (try all variants)
      const contenteditableSelectors = [
        '[contenteditable="true"]',
        '[contenteditable="plaintext-only"]',
        'div[contenteditable]',
        '[contenteditable]',
      ];
      for (const sel of contenteditableSelectors) {
        const els = document.querySelectorAll(sel);
        for (const e of els) {
          if (isElementVisible(e)) return e;
        }
      }
    }

    // For ChatGPT-specific patterns — prefer main message input
    if (lower.includes('message') || lower.includes('prompt') || lower.includes('chat')) {
      const chatSelectors = [
        '#prompt-textarea',
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="Message"]',
        '[contenteditable="true"]',
        '[contenteditable="plaintext-only"]',
        'div[contenteditable="true"]',
        'div[contenteditable]',
        '[contenteditable]',
        'textarea',
      ];
      // Prefer contenteditable with message-like placeholder/aria
      const allEditable = document.querySelectorAll('[contenteditable="true"], [contenteditable="plaintext-only"], div[contenteditable], [contenteditable]');
      for (const e of allEditable) {
        if (!isElementVisible(e)) continue;
        const ph = (e.getAttribute('placeholder') || e.getAttribute('aria-placeholder') || e.getAttribute('aria-label') || '').toLowerCase();
        if (ph.includes('message') || ph.includes('prompt') || ph.includes('chat') || ph.includes('send')) return e;
      }
      for (const sel of chatSelectors) {
        const els = document.querySelectorAll(sel);
        for (const e of els) {
          if (isElementVisible(e)) return e;
        }
      }
    }

    // For buttons - try text matching (add to cart, save, done, search, send, etc.)
    // Include long selectors (e.g. Gmail nth-of-type chains) and dynamic IDs so we still run button fallbacks
    const looksLikeFragileSelector = selector.length > 60 || /^#[a-zA-Z]{5,}$/.test(selector.trim()) || (selector.includes('nth-of-type') && selector.includes('div'));
    const buttonLikeSelectors = looksLikeFragileSelector || lower.includes('button') || lower === 'button' || lower.includes('add') || lower.includes('cart') || lower.includes('search') || lower.includes('save') || lower.includes('done') || lower.includes('close') || lower.includes('check') || lower.includes('send') || lower.includes('submit');
    if (buttonLikeSelectors) {
      let buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"], a[role="button"], span[role="button"], input[value], div[role="button"]'));
      // Google Keep / note apps and Gmail: icon buttons with aria-label (Done, Save, Close, Send) — add to list
      if (lower.includes('save') || lower.includes('done') || lower.includes('close') || lower.includes('check') || lower.includes('send') || looksLikeFragileSelector) {
        document.querySelectorAll('[aria-label], [title]').forEach((el) => {
          const label = (el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase();
          if (label && ['done', 'save', 'close', 'check', 'tick', 'submit', 'confirm', 'send'].some((t) => label.includes(t)) && isElementVisible(el)) {
            buttons.push(el);
          }
        });
      }
      // Add-to-cart and save/done variants (Daraz, Amazon, Google Keep, etc.)
      const searchTexts = [
        'send', 'submit', 'post', 'enter', 'search', 'go', 'buy now',
        'add to cart', 'add to basket', 'add to bag', 'add to', 'cart', 'bag',
        'save', 'done', 'close', 'check', 'tick', 'checkmark', 'finish', 'confirm'
      ];
      for (const btn of buttons) {
        if (!isElementVisible(btn)) continue;
        const text = (btn.textContent || btn.value || btn.getAttribute('aria-label') || btn.title || btn.getAttribute('data-action') || '').toLowerCase();
        if (searchTexts.some((t) => text.includes(t))) return btn;
      }
      // Try matching selector as button label (e.g. selector="Add to Cart" or "Done")
      if (selector && selector.length > 2 && selector.length < 80 && !selector.includes('[') && !selector.includes('#')) {
        const selText = selector.replace(/["']/g, '').trim().toLowerCase();
        for (const btn of buttons) {
          if (!isElementVisible(btn)) continue;
          const text = (btn.textContent || btn.value || btn.getAttribute('aria-label') || '').trim().toLowerCase();
          if (text.includes(selText) || selText.includes(text)) return btn;
        }
      }
      // Fallback: first visible button
      for (const btn of buttons) {
        if (isElementVisible(btn)) return btn;
      }
    }

    return null;
  }

  function setCaretToEnd(el) {
    try {
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) {}
  }

  function typeIntoElement(el, value) {
    if (!value && value !== 0) value = '';
    const str = String(value);
    
    el.focus();
    el.click?.(); // Some SPAs need click to activate input
    
    // Handle contenteditable elements (like ChatGPT, Claude, etc.)
    // React/SPAs often ignore direct innerText — use execCommand or character-by-character
    if (el.isContentEditable || el.getAttribute('contenteditable')) {
      el.focus();
      // Clear first: select all and delete
      try {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('delete', false, null);
      } catch (_) {}

      // Method 1: execCommand('insertText') — fires input events like real typing (works with React)
      try {
        setCaretToEnd(el);
        if (document.execCommand('insertText', false, str)) {
          el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: str }));
          return;
        }
      } catch (_) {}

      // Method 2: Character-by-character (most reliable when insertText fails)
      try {
        setCaretToEnd(el);
        for (let i = 0; i < str.length; i++) {
          document.execCommand('insertText', false, str[i]);
        }
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: str }));
        return;
      } catch (_) {}

      // Method 3: Direct DOM + events fallback
      el.focus();
      el.textContent = '';
      el.innerText = str;
      el.textContent = str;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: str }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    
    // Handle regular input/textarea elements
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.value = str;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    
    // Fallback: try setting value or textContent
    if ('value' in el) {
      el.value = str;
    } else {
      el.textContent = str;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Dismiss in-page confirmation dialogs (e.g. LeetCode "Your code will be discarded").
   * Finds a modal/dialog with known text and clicks the confirm button (Replace / OK / Yes).
   */
  function dismissConfirmationDialog() {
    const confirmTexts = ['your code will be discarded', 'are you sure', 'discard changes', 'replace with', 'replaced with your last submission'];
    const confirmButtonLabels = ['replace', 'ok', 'yes', 'confirm', 'submit', 'allow', 'accept'];
    const cancelLabels = ['cancel', 'no', 'back'];

    const allText = document.body ? document.body.innerText || '' : '';
    const hasConfirmDialog = confirmTexts.some((t) => allText.toLowerCase().includes(t));
    if (!hasConfirmDialog) return false;

    // Prefer buttons inside a dialog; fallback to full document (LeetCode may use React portal)
    const dialog = document.querySelector('[role="dialog"]');
    const scopes = dialog ? [dialog, document.body] : [document.body];
    for (const scope of scopes) {
      const buttons = scope.querySelectorAll('button, [role="button"], a[role="button"], div[role="button"], [data-e2e-locator="confirm-button"], span[role="button"]');
      for (const btn of buttons) {
        if (!isElementVisible(btn)) continue;
        const text = (btn.textContent || btn.getAttribute('aria-label') || btn.value || '').trim().toLowerCase();
        if (cancelLabels.some((c) => text === c || text.startsWith(c + ' '))) continue;
        if (confirmButtonLabels.some((c) => text.includes(c))) {
          btn.click();
          return true;
        }
      }
    }
    return false;
  }

  function executeAction(action) {
    const type = (action.type || '').toUpperCase();
    if (type === 'NAVIGATE') {
      return { success: false, error: 'NAVIGATE handled by background' };
    }
    if (type === 'CLICK') {
      const el = findElement(action.selector);
      if (!el) throw new Error(`Selector not found: ${action.selector}`);
      el.click();
      return { success: true, action: 'click' };
    }
    if (type === 'TYPE') {
      const el = findElement(action.selector);
      if (!el) throw new Error(`Selector not found: ${action.selector}`);
      const val = action.value ?? '';
      // Return promise: delay so ChatGPT/SPA input is focused, then type
      return new Promise((resolve, reject) => {
        el.focus();
        setTimeout(() => {
          try {
            typeIntoElement(el, val);
            resolve({ success: true, action: 'type', element: el.tagName || el.nodeName });
          } catch (e) {
            reject(e);
          }
        }, 400);
      });
    }
    if (type === 'SUBMIT_FORM') {
      const el = findElement(action.selector) || document.querySelector('form');
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
    (async () => {
      try {
        const result = await Promise.resolve(executeAction(msg.action));
        const actionType = (msg.action?.type || '').toUpperCase();
        // After TYPE or CLICK, LeetCode (and similar) may show "Your code will be discarded" — auto-dismiss so submit can proceed
        if (actionType === 'TYPE' || actionType === 'CLICK') {
          for (const delay of [350, 550]) {
            await new Promise((r) => setTimeout(r, delay));
            if (dismissConfirmationDialog()) {
              await new Promise((r) => setTimeout(r, 200));
              break;
            }
          }
        }
        sendResponse({ ok: true, result });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true; // Keep channel open for async sendResponse
  });
})();
