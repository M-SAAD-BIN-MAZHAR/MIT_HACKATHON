/**
 * Decision Agent — Workflow planner and reasoning.
 * Input: structured page data, user goal. Output: actions[], required_permissions[].
 */

const DECISION_INITIAL_PROMPT = `You are a workflow planner for a browser automation agent.
Given a user goal and optional current context (URL, page data), produce a JSON plan.

Respond ONLY with valid JSON in this exact format:
{
  "actions": [
    {"type": "NAVIGATE", "url": "https://example.com"},
    {"type": "READ_PAGE"},
    {"type": "CLICK", "selector": "button.submit"},
    {"type": "TYPE", "selector": "input#search", "value": "query"},
    {"type": "SUBMIT_FORM", "selector": "form#login"}
  ],
  "required_permissions": ["READ_PAGE", "OPEN_TAB", "FILL_FORM", "SUBMIT_ACTION"]
}

Action types: NAVIGATE, READ_PAGE, CLICK, TYPE, SUBMIT_FORM.
Permission types: READ_PAGE, OPEN_TAB, FILL_FORM, SUBMIT_ACTION.
If no page data yet, focus on navigation first. Keep actions minimal and ordered.`;

const DECISION_FINAL_PROMPT = `You are an intelligent browser automation planner. You receive COMPLETE page structure: buttons, forms, links, inputs (with labels, placeholders, types), and visible text.

YOUR JOB: Create a plan to interact with the ACTUAL browser page using DOM elements.

AVAILABLE ACTION TYPES:
- NAVIGATE: Navigate to a URL
- TYPE: Type text into an input field
- CLICK: Click a button or link
- SUBMIT_FORM: Submit a form

STRATEGY:
1. If user wants to go to a specific site (ChatGPT, Google, etc.) and we're not there → NAVIGATE first
2. Find the right input field by matching label, placeholder, or type
3. TYPE the value into that input
4. Find and CLICK the submit/send button

EXAMPLES:

Goal: "open ChatGPT and write hello world"
Current URL: "chrome://newtab"
Actions:
[
  {"type": "NAVIGATE", "url": "https://chat.openai.com"},
  {"type": "TYPE", "selector": "textarea", "value": "hello world"},
  {"type": "CLICK", "selector": "button[aria-label='Send']"}
]

Goal: "search Google for AI"
Current URL: "https://www.google.com"
Page has: input with name="q"
Actions:
[
  {"type": "TYPE", "selector": "input[name='q']", "value": "AI"},
  {"type": "CLICK", "selector": "button[type='submit']"}
]

Goal: "write test message"
Current URL: "https://example.com/chat"
Page has: textarea with placeholder="Type a message"
Actions:
[
  {"type": "TYPE", "selector": "textarea[placeholder='Type a message']", "value": "test message"},
  {"type": "CLICK", "selector": "button containing 'Send'"}
]

SELECTOR MATCHING RULES:
- Use EXACT selectors from the page data provided
- For inputs: match by selector, type, label, or placeholder
- For buttons: match by selector or text content
- For contenteditable: use the selector as-is

VALUE EXTRACTION:
- "write X" → value="X"
- "search for X" → value="X"  
- "type X" → value="X"

CRITICAL: You MUST use actual DOM elements. No API calls, no shortcuts. Real browser automation only.

Respond ONLY with valid JSON:
{
  "actions": [
    {"type": "NAVIGATE", "url": "https://..."},
    {"type": "TYPE", "selector": "exact-selector-from-page", "value": "extracted-value"},
    {"type": "CLICK", "selector": "exact-button-selector"}
  ],
  "required_permissions": ["READ_PAGE", "FILL_FORM", "SUBMIT_ACTION", "OPEN_TAB"]
}`;

async function parseJsonFromResponse(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in response');
  return JSON.parse(match[0]);
}

async function decisionInitial(state, callLLM) {
  const messages = [
    { role: 'system', content: DECISION_INITIAL_PROMPT },
    {
      role: 'user',
      content: `User goal: ${state.userGoal}\nCurrent URL: ${state.currentUrl ?? 'unknown'}\nPage data: ${state.pageData ? JSON.stringify(state.pageData).slice(0, 2000) : 'not yet available'}`,
    },
  ];
  const response = await callLLM(messages);
  const parsed = await parseJsonFromResponse(response);
  return {
    ...state,
    initialPlan: parsed,
    actions: parsed.actions ?? [],
    requiredPermissions: parsed.required_permissions ?? [],
  };
}

async function decisionFinal(state, callLLM) {
  // Format page data in a more readable way for the LLM
  const pageInfo = {
    url: state.currentUrl,
    inputs: (state.pageData?.inputs || []).map(i => ({
      selector: i.selector,
      type: i.type,
      label: i.label,
      placeholder: i.placeholder,
      name: i.name
    })),
    buttons: (state.pageData?.buttons || []).map(b => ({
      selector: b.selector,
      text: b.text
    })),
    forms: (state.pageData?.forms || []).map(f => ({
      selector: f.selector,
      inputs: f.inputs
    })),
    links: (state.pageData?.links || []).slice(0, 20).map(l => ({
      selector: l.selector,
      text: l.text,
      href: l.href
    })),
    important_text: (state.pageData?.important_text || []).slice(0, 50)
  };

  // Check if navigation is needed based on goal
  let navigationHint = '';
  const goal = (state.userGoal || '').toLowerCase();
  if (goal.includes('chatgpt') || goal.includes('gpt') || goal.includes('openai')) {
    if (!state.currentUrl.includes('chat.openai.com') && !state.currentUrl.includes('chatgpt.com')) {
      navigationHint = '\n\nNOTE: User wants ChatGPT but current page is not ChatGPT. You MUST include NAVIGATE action to https://chat.openai.com first!';
    }
  } else if (goal.includes('google') && goal.includes('search')) {
    if (!state.currentUrl.includes('google.com')) {
      navigationHint = '\n\nNOTE: User wants Google but current page is not Google. You MUST include NAVIGATE action to https://www.google.com first!';
    }
  }

  const messages = [
    { role: 'system', content: DECISION_FINAL_PROMPT },
    {
      role: 'user',
      content: `User goal: ${state.userGoal}\n\nCurrent page: ${state.currentUrl}\n\nPage structure:\n${JSON.stringify(pageInfo, null, 2)}${navigationHint}\n\nIMPORTANT: Use the page elements above. Create TYPE and CLICK actions using the actual selectors provided. If navigation is needed, include NAVIGATE action FIRST.`,
    },
  ];
  const response = await callLLM(messages);
  const parsed = await parseJsonFromResponse(response);
  return {
    ...state,
    finalPlan: parsed,
    actions: parsed.actions ?? [],
    requiredPermissions: parsed.required_permissions ?? state.requiredPermissions ?? [],
  };
}
