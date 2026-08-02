import { DB } from './database.js';

// Simple search using inverted index and TF counts. Returns topK memory objects.
export async function searchMemoriesByText(query, topK = 5) {
  const qTokens = String(query || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(w => w.length > 2);

  const postingMaps = {};
  await Promise.all(qTokens.map(async t => {
    const entry = await DB.get('invertedIndex', t);
    if (!entry || !entry.postings) return;
    entry.postings.forEach(p => { postingMaps[p.id] = (postingMaps[p.id] || 0) + p.count; });
  }));

  const scored = Object.entries(postingMaps).map(([id, score]) => ({ id, score }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topK);
  const results = await Promise.all(top.map(async s => ({ ...(await DB.get('memories', s.id)), score: s.score })));
  return results;
}
