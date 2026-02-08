/**
 * Reader Agent — Converts DOM snapshot into structured data.
 * Input: DOM snapshot (HTML or structured). Output: buttons, forms, links, products, important_text.
 */

const READER_PROMPT = `You are a DOM structuring agent. Given extracted page data (buttons, forms, links, full text), enrich and validate it.

The data already contains selectors. Your job: ensure structure is clean, add any inferred fields, summarize key content.

Respond ONLY with valid JSON:
{
  "buttons": [{"text": "...", "selector": "..."}],
  "forms": [{"selector": "...", "inputs": [{"name": "...", "selector": "...", "label": "..."}]}],
  "links": [{"text": "...", "href": "...", "selector": "..."}],
  "products": [],
  "important_text": ["key snippet 1", "snippet 2"]
}

Preserve all selectors from input. important_text: key visible content for context.`;

async function parseJsonFromResponse(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in reader response');
  return JSON.parse(match[0]);
}

async function readerAgent(state, callLLM) {
  const domSnapshot = state.domSnapshot ?? '';
  const messages = [
    { role: 'system', content: READER_PROMPT },
    {
      role: 'user',
      content: `Extract structured data from this DOM snapshot:\n\n${domSnapshot.slice(0, 15000)}`,
    },
  ];
  const response = await callLLM(messages);
  const parsed = await parseJsonFromResponse(response);
  return {
    ...state,
    pageData: {
      buttons: parsed.buttons ?? [],
      forms: parsed.forms ?? [],
      links: parsed.links ?? [],
      products: parsed.products ?? [],
      important_text: parsed.important_text ?? [],
    },
  };
}
