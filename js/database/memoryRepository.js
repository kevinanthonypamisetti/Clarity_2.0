import { DB } from './database.js';
import EventBus from '../utils/events.js';

function simpleTokenizer(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(w => w.length > 2);
}

export const MemoryRepo = {
  async add(memory) {
    // memory: { id, userId, sourceId, text, type, category, createdAt }
    if (!memory.id) memory.id = crypto.randomUUID();
    await DB.put('memories', memory);
    // update inverted index
    const tokens = simpleTokenizer(memory.text);
    const counts = tokens.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
    const updates = Object.keys(counts).map(async token => {
      const existing = await DB.get('invertedIndex', token) || { token, postings: [] };
      const idx = existing.postings.findIndex(p => p.id === memory.id);
      if (idx === -1) existing.postings.push({ id: memory.id, count: counts[token], createdAt: memory.createdAt });
      else existing.postings[idx] = { id: memory.id, count: counts[token], createdAt: memory.createdAt };
      return DB.put('invertedIndex', existing);
    });
    await Promise.all(updates);
    // emit event for indexing pipeline
    try { EventBus.emit('clarity:memory-created', { memory }); } catch (e) { EventBus.emit('clarity:error', { module: 'memoryRepository', error: e?.message, stack: e?.stack }); }
    return memory;
  },
  async get(id) { return DB.get('memories', id); },
  async listByUser(userId) { return DB.queryIndex('memories', 'userId', userId); },
  async delete(id) {
    const mem = await DB.get('memories', id);
    if (!mem) return false;
    await DB.del('memories', id);
    // remove from inverted index (naive)
    const tokens = simpleTokenizer(mem.text);
    await Promise.all(tokens.map(async t => {
      const e = await DB.get('invertedIndex', t);
      if (!e) return;
      e.postings = e.postings.filter(p => p.id !== id);
      if (e.postings.length === 0) await DB.del('invertedIndex', t);
      else await DB.put('invertedIndex', e);
    }));
    try { EventBus.emit('clarity:memory-deleted', { id }); } catch (e) { EventBus.emit('clarity:error', { module: 'memoryRepository', error: e?.message, stack: e?.stack }); }
    return true;
  }
};
