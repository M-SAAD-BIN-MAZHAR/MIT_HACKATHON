/**
 * Content Script: Page Reader
 * Extracts FULL page content including JS-rendered DOM.
 * Runs at document_idle; waits for dynamic content before extracting.
 */

(function () {
  'use strict';

  const HTML_MAX = 80000;
  const TEXT_MAX = 10000;
  const WAIT_FOR_JS_MS = 2500;

  function getSelector(el) {
    if (el.id && /^[a-zA-Z][\w-]*$/.test(el.id)) return `#${el.id}`;
    const tag = el.tagName?.toLowerCase?.() || 'div';
    const parent = el.parentElement;
    if (!parent) return tag;
    const siblings = [...parent.children].filter((c) => c.tagName === el.tagName);
    const idx = siblings.indexOf(el) + 1;
    return `${getSelector(parent)} > ${tag}:nth-of-type(${idx})`;
  }

  function isVisible(el) {
    if (el.nodeType === Node.TEXT_NODE) return true;
    if (el.nodeType !== Node.ELEMENT_NODE) return true;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function getDataAttrs(el) {
    const attrs = {};
    if (el.nodeType !== Node.ELEMENT_NODE) return attrs;
    for (const a of el.attributes || []) {
      if (a.name.startsWith('data-')) attrs[a.name] = a.value?.slice(0, 100);
    }
    return attrs;
  }

  function extractStructured(waitForJs = true) {
    const buttons = [];
    const allClickables = new Set();
    document.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]').forEach((el) => {
      if (!isVisible(el)) return;
      const text = el.value ?? el.textContent?.trim() ?? el.getAttribute('aria-label') ?? el.title ?? '';
      buttons.push({ text: text.slice(0, 300), selector: getSelector(el), data: getDataAttrs(el) });
      allClickables.add(el);
    });
    document.querySelectorAll('[onclick], [role="link"]:not(a), [tabindex]:not([tabindex="-1"])').forEach((el) => {
      if (!isVisible(el) || allClickables.has(el)) return;
      const text = el.textContent?.trim()?.slice(0, 200) || el.getAttribute('aria-label') || '';
      if (text || el.getAttribute('onclick')) {
        buttons.push({ text, selector: getSelector(el), kind: 'interactive', data: getDataAttrs(el) });
      }
    });

    const links = [];
    document.querySelectorAll('a[href]').forEach((el) => {
      if (!isVisible(el)) return;
      links.push({ text: (el.textContent || '').trim().slice(0, 300), href: el.getAttribute('href'), selector: getSelector(el) });
    });

    const inputs = [];
    document.querySelectorAll('input:not([type="hidden"]), select, textarea, [contenteditable="true"], [contenteditable="plaintext-only"], div[contenteditable], [contenteditable]').forEach((inp) => {
      if (!isVisible(inp)) return;
      let label = '';
      const id = inp.id;
      if (id) {
        const lbl = document.querySelector(`label[for="${id}"]`);
        if (lbl) label = (lbl.textContent || '').trim().slice(0, 200);
      }
      if (!label && inp.closest('label')) label = (inp.closest('label').textContent || '').trim().slice(0, 200);
      if (!label && inp.previousElementSibling?.tagName?.toLowerCase() === 'label') label = (inp.previousElementSibling.textContent || '').trim().slice(0, 200);
      
      // Detect type
      let inpType = inp.type || inp.tagName?.toLowerCase?.() || 'text';
      if (inp.getAttribute?.('contenteditable') || inp.isContentEditable) {
        inpType = 'contenteditable';
      }
      
      // Get placeholder from various sources
      const placeholder = inp.placeholder || 
                         inp.getAttribute?.('data-placeholder') || 
                         inp.getAttribute?.('aria-placeholder') ||
                         inp.getAttribute?.('aria-label') || '';
      
      inputs.push({ 
        name: inp.name || '', 
        type: inpType, 
        label, 
        placeholder, 
        selector: getSelector(inp),
        id: inp.id || ''
      });
    });

    const forms = [];
    document.querySelectorAll('form').forEach((form) => {
      if (!isVisible(form)) return;
      const formInputs = [];
      form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea').forEach((inp) => {
        if (!isVisible(inp)) return;
        let label = '';
        const id = inp.id;
        if (id) {
          const lbl = form.querySelector(`label[for="${id}"]`);
          if (lbl) label = (lbl.textContent || '').trim().slice(0, 200);
        }
        if (!label && inp.previousElementSibling?.tagName?.toLowerCase() === 'label') label = (inp.previousElementSibling.textContent || '').trim().slice(0, 200);
        formInputs.push({ name: inp.name || '', type: inp.type || inp.tagName?.toLowerCase?.(), label, selector: getSelector(inp) });
      });
      forms.push({ selector: getSelector(form), action: form.action || '', inputs: formInputs });
    });

    const visibleText = [];
    const walk = (node, maxLen) => {
      if (visibleText.join('').length >= maxLen) return;
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent?.trim?.();
        if (t) visibleText.push(t);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName?.toLowerCase?.();
      if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'svg') return;
      if (!isVisible(node)) return;
      for (const c of node.childNodes || []) walk(c, maxLen);
    };
    if (document.body) walk(document.body, TEXT_MAX);
    const fullText = visibleText.join(' ').slice(0, TEXT_MAX);
    const importantText = fullText.split(/\s+/).filter((w) => w.length > 2).slice(0, 100);

    const html = document.documentElement?.outerHTML?.slice?.(0, HTML_MAX) || '';

    return {
      url: window.location.href,
      title: document.title || '',
      buttons,
      links,
      forms,
      inputs,
      important_text: importantText,
      full_text: fullText,
      html,
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'GET_DOM_SNAPSHOT') {
      const waitForJs = msg.waitForJs !== false;
      const doExtract = () => {
        const data = extractStructured(waitForJs);
        sendResponse({ ok: true, data });
      };
      if (waitForJs && typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => setTimeout(doExtract, WAIT_FOR_JS_MS), { timeout: WAIT_FOR_JS_MS + 1000 });
      } else {
        setTimeout(doExtract, waitForJs ? WAIT_FOR_JS_MS : 100);
      }
      return true;
    }
    if (msg.type === 'EXECUTE_ACTION') return false;
    return false;
  });
})();
