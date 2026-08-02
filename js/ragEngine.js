import { queryRag } from './db.js';

export async function getContextForQuery({ userId, query, topK = 5 }) {
  const resp = await queryRag({ userId, query, topK });
  if (!resp.ok) throw new Error(resp.error || 'RAG query failed');
  const matches = resp.matches || [];
  const context = matches.map((m, i) => `[Memory ${i + 1}] (${m.type} · ${m.category}): "${m.text}"`).join('\n');
  return { context, matches, method: resp.method };
}
