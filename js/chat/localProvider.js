// Minimal local provider for offline-first operation.
// Exposes `generate({prompt, context})` and `stream({prompt, context, onChunk})`.

export async function generate({prompt, context} = {}) {
  const items = (context && context.items) || [];
  const excerpt = items.slice(0, 5).map((it, i) => {
    const t = it.text || it.content || it.body || JSON.stringify(it);
    return `[${i+1}] ${String(t).slice(0, 180)}`;
  }).join('\n\n');

  const text = `Based on ${items.length} retrieved items:\n\n${excerpt}\n\nAnswer:\n${prompt}\n\n(End of local summary)`;
  return {text, confidence: 0.6, citations: items.map(i=>i.id)};
}

export async function stream({prompt, context, onChunk} = {}) {
  const res = await generate({prompt, context});
  const str = res.text || '';
  // naive chunking
  const chunkSize = 120;
  for (let i = 0; i < str.length; i += chunkSize) {
    const chunk = str.slice(i, i + chunkSize);
    try {
      // support cooperative abort via window.ClarityAI.abortRequested
      const abortRequested = (typeof window !== 'undefined' && window.ClarityAI && window.ClarityAI.abortRequested) || false;
      if (abortRequested) {
        // clear abort flag
        if (typeof window !== 'undefined' && window.ClarityAI) window.ClarityAI.abortRequested = false;
        break;
      }
      onChunk && onChunk(chunk);
      // small delay to simulate streaming
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 30));
    } catch (e) {
      // ignore consumer errors
    }
  }
  return {text: str, confidence: res.confidence, citations: res.citations};
}

// Provide default registration when loaded in browser
if (typeof window !== 'undefined') {
  window.ClarityAI = window.ClarityAI || {};
  window.ClarityAI.providers = window.ClarityAI.providers || {};
  window.ClarityAI.providers.local = window.ClarityAI.providers.local || {generate, stream};
}
