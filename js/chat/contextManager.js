import tokenize from '../rag/tokenizer.js';

function estimateTokens(text) {
  return tokenize(text).length;
}

function truncateText(text, maxChars = 200) {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1) + '…';
}

/**
 * Build a merged context from search results.
 * searchResults: [{id, source, title, snippet, score, confidence, metadata}]
 */
export function buildContext(searchResults = [], opts = {}) {
  const { tokenBudget = 1000, maxItems = 20, snippetChars = 300 } = opts;
  if (!Array.isArray(searchResults)) searchResults = [];

  // dedupe by id, keep highest score
  const map = new Map();
  for (const r of searchResults) {
    if (!r || !r.id) continue;
    const prev = map.get(r.id);
    if (!prev || (r.score || 0) > (prev.score || 0)) map.set(r.id, r);
  }

  let docs = Array.from(map.values());
  // sort by score desc
  docs.sort((a, b) => (b.score || 0) - (a.score || 0));

  const memories = [];
  const citations = [];
  let tokensUsed = 0;

  for (const d of docs) {
    if (memories.length >= maxItems) break;
    const snippet = truncateText(d.snippet || d.text || '', snippetChars);
    const est = Math.max(1, estimateTokens(snippet));
    if (tokensUsed + est > tokenBudget) break;
    tokensUsed += est;
    memories.push({ id: d.id, source: d.source || 'memory', title: d.title || snippet.slice(0, 60), snippet, score: d.score || 0, confidence: d.confidence || 0, metadata: d.metadata || {} });
    citations.push({ id: d.id, source: d.source || 'memory', title: d.title || '', score: d.score || 0 });
  }

  // compute overall confidence: weighted average by score
  let totalWeight = 0; let weighted = 0;
  for (const m of memories) {
    const w = Math.max(0, m.score || 0);
    weighted += (m.confidence || 0) * w;
    totalWeight += w;
  }
  const confidence = totalWeight > 0 ? (weighted / totalWeight) : 0;

  return { confidence: Math.min(1, Math.max(0, confidence)), memories, citations, memoryCount: memories.length, tokensUsed };
}

export default { buildContext };
