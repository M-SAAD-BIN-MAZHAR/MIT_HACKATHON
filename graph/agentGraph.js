/**
 * LangGraph-style workflow: decision_initial → navigator → reader → decision_final → executor.
 * Each node receives state and returns updated state.
 */

const NODES = {
  decision_initial: 'decision_initial',
  navigator: 'navigator',
  reader: 'reader',
  decision_final: 'decision_final',
  executor: 'executor',
};

const FLOW = [
  'decision_initial',
  'navigator',
  'reader',
  'decision_final',
  'executor',
];

async function runGraph(initialState, handlers) {
  const state = { ...initialState };
  const logs = [];
  const emit = (node, msg, data) => {
    logs.push({ node, msg, data, ts: Date.now() });
    handlers?.onLog?.(node, msg, data);
  };

  const runNode = async (nodeName) => {
    emit(nodeName, 'start', {});
    try {
      let nextState;
      switch (nodeName) {
        case NODES.decision_initial:
          nextState = await handlers.decisionInitial(state, handlers.callLLM);
          break;
        case NODES.navigator:
          nextState = await handlers.navigator(state, handlers.callLLM);
          break;
        case NODES.reader:
          nextState = await handlers.reader(state, handlers.callLLM);
          break;
        case NODES.decision_final:
          nextState = await handlers.decisionFinal(state, handlers.callLLM);
          break;
        case NODES.executor:
          nextState = await handlers.executor(state, handlers.sendToContent);
          break;
        default:
          nextState = state;
      }
      Object.assign(state, nextState);
      emit(nodeName, 'complete', {});
      return nextState;
    } catch (err) {
      emit(nodeName, 'error', { error: err.message });
      throw err;
    }
  };

  for (const nodeName of FLOW) {
    if (state.paused || state.stopped) break;
    await runNode(nodeName);
  }

  return { state, logs };
}
