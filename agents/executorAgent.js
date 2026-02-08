/**
 * Executor Agent — Executes actions: click, type, navigate, submit forms.
 * Input: action plan. Responsibilities: click elements, type text, navigate, submit.
 */

async function executorAgent(state, sendToContent) {
  const actions = state.actions ?? [];
  const results = [];
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (state.paused) break;
    if (state.stopped) break;
    try {
      const result = await sendToContent(action);
      results.push({ action, result, index: i });
    } catch (err) {
      results.push({ action, error: err.message, index: i });
    }
  }
  return {
    ...state,
    executionResults: results,
  };
}
