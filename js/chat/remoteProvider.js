// Remote provider that proxies to backend `/api/chat`
async function postChat(payload) {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return resp;
}

export async function generate({prompt, context} = {}) {
  const messages = [];
  if (context && Array.isArray(context.items) && context.items.length) {
    const ctxText = context.items.map((it,i) => `[${i+1}] ${it.text || it.content || it.body || ''}`).join('\n');
    messages.push({ role: 'system', content: `Context:\n${ctxText}` });
  }
  messages.push({ role: 'user', content: prompt });

  const r = await postChat({ provider: 'openai', messages, stream: false });
  const j = await r.json();
  return j;
}

export async function stream({prompt, context, onChunk} = {}) {
  const messages = [];
  if (context && Array.isArray(context.items) && context.items.length) {
    const ctxText = context.items.map((it,i) => `[${i+1}] ${it.text || it.content || it.body || ''}`).join('\n');
    messages.push({ role: 'system', content: `Context:\n${ctxText}` });
  }
  messages.push({ role: 'user', content: prompt });

  const resp = await postChat({ provider: 'openai', messages, stream: true });
  if (!resp.ok) throw new Error('proxy error: ' + resp.status);

  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // cooperative abort
    if (typeof window !== 'undefined' && window.ClarityAI && window.ClarityAI.abortRequested) {
      try { reader.cancel(); } catch (e) {}
      // clear flag
      window.ClarityAI.abortRequested = false;
      return;
    }
    buffer += decoder.decode(value, { stream: true });
    // emit raw chunks; backend sends SSE-framed text so we forward lines
    // split on SSE delimiter
    const parts = buffer.split('\n\n');
    buffer = parts.pop();
    for (const p of parts) {
      const line = p.trim();
      if (!line) continue;
      // remove leading 'data: '
      const data = line.startsWith('data:') ? line.replace(/^data:\s*/i, '') : line;
      if (data === '[DONE]') {
        return;
      }
      try {
        const parsed = JSON.parse(data);
        // if it's a final object with ok, ignore
        if (parsed && parsed.ok) continue;
      } catch (e) {
        // not JSON — treat as token
      }
      onChunk && onChunk(data);
    }
  }
}

// Register provider on window if available
if (typeof window !== 'undefined') {
  window.ClarityAI = window.ClarityAI || {};
  window.ClarityAI.providers = window.ClarityAI.providers || {};
  window.ClarityAI.providers.openai = window.ClarityAI.providers.openai || { generate, stream };
}

export default { generate, stream };
