/**
 * Navigator Agent — Decides URLs and navigation steps.
 * Input: user goal, current URL. Output: OPEN_URL, SWITCH_TAB, SEARCH.
 */

const NAVIGATOR_PROMPT = `You are a navigation agent for a browser automation system.
Given a user goal and current URL, decide navigation steps.

Respond ONLY with valid JSON:
{
  "steps": [
    {"action": "OPEN_URL", "url": "https://example.com", "reason": "..."},
    {"action": "SEARCH", "query": "search terms", "engine": "google"},
    {"action": "SWITCH_TAB", "index": 0}
  ]
}

Actions: OPEN_URL (open a URL), SEARCH (use search engine), SWITCH_TAB (switch to tab index).
Return empty steps if no navigation needed. URLs must be absolute.`;

async function parseJsonFromResponse(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { steps: [] };
  return JSON.parse(match[0]);
}

async function navigatorAgent(state, callLLM) {
  const messages = [
    { role: 'system', content: NAVIGATOR_PROMPT },
    {
      role: 'user',
      content: `User goal: ${state.userGoal}\nCurrent URL: ${state.currentUrl ?? 'none'}`,
    },
  ];
  const response = await callLLM(messages);
  const parsed = await parseJsonFromResponse(response);
  const steps = parsed.steps ?? [];
  const navActions = steps
    .filter((s) => s.action === 'OPEN_URL' || s.action === 'SEARCH')
    .map((s) => {
      if (s.action === 'SEARCH') {
        const q = encodeURIComponent(s.query ?? s.search ?? '');
        return { type: 'NAVIGATE', url: `https://www.google.com/search?q=${q}` };
      }
      return { type: 'NAVIGATE', url: s.url };
    });
  return {
    ...state,
    navigationSteps: steps,
    actions: [...(state.actions ?? []), ...navActions],
  };
}
