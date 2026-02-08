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

CRITICAL — NEVER SKIP THE FINAL ACTION:
- If the user said "add to cart" / "add to bag" / "add it to cart" → you MUST output a CLICK action for the Add-to-Cart button. Find the button whose "text" contains "Add to Cart", "Add to Bag", "Add to Basket", "Cart" and use its "selector".
- If the user said "save" / "add task" / "add note" / "add a task" (e.g. Google Keep) → you MUST output a CLICK action AFTER the TYPE. Typing the task is not enough — the user must click Save / Done / Checkmark / Close to save. Find the button or icon with "Done", "Save", "Close", "Check" (or aria-label) and use its "selector".
- Never end a "add to cart" or "save task" goal with only TYPE — always include the CLICK that completes the action.

AVAILABLE ACTION TYPES:
- NAVIGATE: Navigate to a URL
- TYPE: Type text into an input field
- CLICK: Click a button or link
- SUBMIT_FORM: Submit a form

MULTI-STEP WORKFLOW: Plan the next 1-5 actions for the CURRENT page. After execution, the agent re-extracts the page and plans the next step.

SELECTOR RULES:
1. Prefer the exact "selector" from the provided buttons/inputs/links.
2. For "add to cart": find button with text containing "Add to Cart", "Add to Bag", "Add to Basket", "Cart", "Buy" — use that button's "selector".
3. For "save task" / Google Keep: find button/element with text or aria-label "Done", "Save", "Close", "Check" (checkmark) — use its "selector". If you see a checkmark icon or "Done" button, that is the save action.
4. Fallback: "button", "input[type='submit']" (executor matches by text).

EXAMPLES:

Goal: "add to cart" or "add it to the cart" (on Daraz/Amazon/product page)
Page has: buttons list with one "Add to Cart" or "Add to Bag"
Actions: [{"type": "CLICK", "selector": "<exact selector from that button in page data>"}]
If no exact selector, use: {"type": "CLICK", "selector": "Add to Cart"} (executor finds by text)

Goal: "open Google Keep and add a random task" or "add a task"
Step 1: NAVIGATE to https://keep.google.com
Step 2 (on Keep): TYPE in the note/title input, then CLICK the Done/Save/Checkmark button
Actions: [{"type": "TYPE", "selector": "<selector of note input>", "value": "random task"}, {"type": "CLICK", "selector": "<selector of Done/Save/checkmark button>"}]
You MUST include both TYPE and CLICK. Without CLICK, the note is not saved.

Goal: "add a random task" (already on Google Keep, note is focused or visible)
Actions: [{"type": "TYPE", "selector": "textarea or [contenteditable] or input", "value": "My random task"}, {"type": "CLICK", "selector": "Done"}]
Or use the selector from page data for the "Done" / checkmark button.

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
  } else if (goal.includes('daraz')) {
    if (!url.includes('daraz')) {
      navigationHint = '\n\nNOTE: User wants Daraz. You MUST include NAVIGATE action to https://www.daraz.pk (or .pk/.bd/.lk as appropriate) first!';
    }
  } else if (goal.includes('google keep') || (goal.includes('keep') && (goal.includes('task') || goal.includes('note') || goal.includes('add')))) {
    if (!url.includes('keep.google.com')) {
      navigationHint = '\n\nNOTE: User wants Google Keep. You MUST include NAVIGATE action to https://keep.google.com first! After typing a task/note you MUST add a CLICK action for Done/Save/checkmark to save it!';
    }
  }

  const goalLower = (state.userGoal || '').toLowerCase();
  const needsFinalClick = /\b(add to cart|add to bag|save|add task|add note|add a task)\b/.test(goalLower);
  const finalClickReminder = needsFinalClick
    ? '\n\nREMINDER: The user goal requires a final CLICK (Add to Cart / Save / Done) to complete. You MUST include that CLICK action — do not output only TYPE.'
    : '';

  const messages = [
    { role: 'system', content: DECISION_FINAL_PROMPT },
    {
      role: 'user',
      content: `User goal: ${state.userGoal}\n\nCurrent page: ${state.currentUrl}\n\nPage structure:\n${JSON.stringify(pageInfo, null, 2)}${navigationHint}${finalClickReminder}\n\nUse the page elements above. Use actual selectors from the structure. If navigation is needed, include NAVIGATE first.`,
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
