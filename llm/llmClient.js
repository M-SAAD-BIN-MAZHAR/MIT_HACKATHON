/**
 * LLM Integration Layer
 * OpenAI-compatible API client. Set API key in extension options or popup.
 * Supports: OpenAI API, or any OpenAI-compatible endpoint (e.g. local LLM, Azure OpenAI).
 */

const DEFAULT_API_URL = 'https://api.openai.com/v1/chat/completions';

async function callLLM(messages, options = {}) {
  const apiKey = options.apiKey ?? (await chrome.storage.local.get('llm_api_key')).llm_api_key;
  const apiUrl = options.apiUrl ?? (await chrome.storage.local.get('llm_api_url')).llm_api_url ?? DEFAULT_API_URL;
  const model = options.model ?? (await chrome.storage.local.get('llm_model')).llm_model ?? 'gpt-4o-mini';

  if (!apiKey) {
    throw new Error('LLM API key not set. Add your API key in the popup settings.');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens ?? 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty LLM response');
  return content;
}
