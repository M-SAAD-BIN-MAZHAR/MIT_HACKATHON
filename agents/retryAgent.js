/**
 * Retry Agent — Proposes alternative actions when an action fails.
 * Input: failed action, error message, page context. Output: alternative action or null.
 */

const RETRY_PROMPT = `You are a browser automation recovery agent. An action failed. Propose ONE alternative DOM action to achieve the same goal.

RULES:
- Only suggest TYPE, CLICK, or NAVIGATE actions
- Use different selectors from the page data
- Try alternative elements (different buttons, inputs, etc.)
- Extract the value/text from the original goal

Respond ONLY with valid JSON:
{
  "alternative": {"type": "CLICK"|"TYPE"|"NAVIGATE", "selector": "...", "value": "...", "url": "..."},
  "reason": "why this might work"
}
Or if no alternative exists: {"alternative": null, "reason": "..."}

Use selectors from the page data. Try different elements that could accomplish the goal.`;

async function parseJsonFromResponse(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { alternative: null };
  return JSON.parse(match[0]);
}

async function retryAgent(failedAction, errorMsg, state, callLLM) {
  // Ask LLM for alternative DOM action
  const messages = [
    { role: 'system', content: RETRY_PROMPT },
    {
      role: 'user',
      content: `Failed action: ${JSON.stringify(failedAction)}\nError: ${errorMsg}\nGoal: ${state.userGoal}\nPage data: ${JSON.stringify(state.pageData || {}).slice(0, 3000)}`,
    },
  ];
  const response = await callLLM(messages);
  const parsed = await parseJsonFromResponse(response);
  return parsed.alternative || null;
}
