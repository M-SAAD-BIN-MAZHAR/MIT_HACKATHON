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

const DECISION_FINAL_PROMPT = `You are an intelligent browser automation planner. You receive the LIVE page structure extracted from the ACTUAL DOM: buttons, forms, links, inputs (with selectors, labels, placeholders).

CRITICAL: You MUST use ONLY selectors from the provided page structure. Every website has different DOM — never assume predefined selectors. Use the exact "selector" values from the page data when available.

AVAILABLE ACTION TYPES:
- NAVIGATE: Navigate to a URL
- TYPE: Type text into an input field
- CLICK: Click a button or link
- SUBMIT_FORM: Submit a form

MULTI-STEP WORKFLOW: The user goal may require multiple page interactions. Plan ONLY the next 1-5 actions for the CURRENT page. After execution, the agent will re-extract the new page DOM and plan the next step.
- "open amazon" → NAVIGATE to amazon.com
- "find iphone 16 pro max" → TYPE in search input, CLICK search button
- "add to cart" → CLICK the "Add to Cart" button (use selector from page data)

SELECTOR RULES:
1. ALWAYS prefer the exact "selector" from the provided buttons/inputs/links — that is the real DOM selector
2. Match by text: find button whose "text" contains "Add to Cart", "Search", "Submit" — use its "selector"
3. For search: find input with name/placeholder containing "search" — use its "selector"
4. Fallback: "input[name='...']", "textarea", "button" (executor has smart matching)

E-COMMERCE EXAMPLES:

Goal: "open amazon and find iphone 16 pro max"
Current URL: "chrome://newtab"
Actions: [{"type": "NAVIGATE", "url": "https://www.amazon.com"}]
(Next loop: on Amazon home, plan TYPE + CLICK search)

Goal: "find iphone 16 pro max" (already on Amazon)
Page has: input with selector "#twotabsearchtextbox", button "Go"
Actions: [{"type": "TYPE", "selector": "#twotabsearchtextbox", "value": "iphone 16 pro max"}, {"type": "CLICK", "selector": "input[value='Go']"}]

Goal: "add to cart" (on product or search results page)
Page has: button with text "Add to Cart", selector from page
Actions: [{"type": "CLICK", "selector": "<use exact selector from button whose text contains 'Add to Cart'>"}]

WHEN GOAL IS ACHIEVED: Return empty actions: {"actions": [], "required_permissions": []}

Respond ONLY with valid JSON:
{
  "actions": [...],
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
  const url = (state.currentUrl || '').toLowerCase();
  if (goal.includes('chatgpt') || goal.includes('gpt') || goal.includes('openai')) {
    if (!url.includes('chat.openai.com') && !url.includes('chatgpt.com')) {
      navigationHint = '\n\nNOTE: User wants ChatGPT. You MUST include NAVIGATE action to https://chat.openai.com first!';
    }
  } else if ((goal.includes('google') && goal.includes('search')) || goal.includes('search google')) {
    if (!url.includes('google.com')) {
      navigationHint = '\n\nNOTE: User wants Google. You MUST include NAVIGATE action to https://www.google.com first!';
    }
  } else if (goal.includes('amazon') || goal.includes('amzn')) {
    if (!url.includes('amazon.')) {
      navigationHint = '\n\nNOTE: User wants Amazon. You MUST include NAVIGATE action to https://www.amazon.com first!';
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
