// js/db.js — frontend DB adapter to call the Clarity backend
const API_BASE = (window.CLARITY_API_BASE || '').replace(/\/$/, '');

export async function saveMemory({ userId, text, type = 'thought', category = null }) {
  const resp = await fetch(`${API_BASE}/api/memories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, text, type, category })
  });
  return resp.json();
}

export async function queryRag({ userId, query, topK = 5 }) {
  const resp = await fetch(`${API_BASE}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, query, topK })
  });
  return resp.json();
}
