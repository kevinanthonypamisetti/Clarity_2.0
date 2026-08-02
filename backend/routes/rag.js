const express = require('express');
const router = express.Router();
const { getEmbedding } = require('../lib/embeddings');

module.exports = function (pool) {
  // Save a memory (stores text and embedding JSON; vector column left null if DB not configured)
  router.post('/memories', async (req, res) => {
    try {
      const { userId, text, type = 'thought', category = null } = req.body;
      if (!userId || !text) return res.status(400).json({ error: 'userId and text required' });

      // generate embedding (store as JSON for portability)
      const embedding = await getEmbedding(text);

      const q = `INSERT INTO memories (user_id, text, type, category, embedding_json)
                 VALUES ($1,$2,$3,$4,$5)
                 RETURNING id, created_at`;
      const vals = [userId, text, type, category, embedding];
      const r = await pool.query(q, vals);
      res.json({ ok: true, id: r.rows[0].id, created_at: r.rows[0].created_at });
    } catch (err) {
      try { const EventBus = require('../lib/eventBus'); EventBus.emitError({ module: 'rag-memories', error: err?.message, stack: err?.stack }); } catch (e) {}
      res.status(500).json({ error: err.message });
    }
  });

  // Query RAG: returns top-k matches using pgvector if available, otherwise falls back to a text search
  router.post('/query', async (req, res) => {
    try {
      const { userId, query, topK = 5 } = req.body;
      if (!userId || !query) return res.status(400).json({ error: 'userId and query required' });

      const embedding = await getEmbedding(query);
      const embString = '[' + embedding.join(',') + ']';

      // Try vector-based search (requires vector column to be present)
      const vectorSql = `SELECT id, text, type, category, created_at, (embedding <-> $1::vector) AS distance
                         FROM memories
                         WHERE user_id = $2 AND embedding IS NOT NULL
                         ORDER BY distance ASC
                         LIMIT $3`;
      const vecRes = await pool.query(vectorSql, [embString, userId, topK]);
      if (vecRes.rows && vecRes.rows.length > 0) {
        const mapped = vecRes.rows.map(r => ({ id: r.id, text: r.text, type: r.type, category: r.category, score: 1 / (1 + r.distance) }));
        return res.json({ ok: true, method: 'vector', matches: mapped });
      }

      // Fallback: simple ILIKE text search
      const textSql = `SELECT id, text, type, category, created_at
                       FROM memories
                       WHERE user_id = $1 AND text ILIKE '%'||$2||'%' 
                       ORDER BY created_at DESC
                       LIMIT $3`;
      const textRes = await pool.query(textSql, [userId, query, topK]);
      const mapped = textRes.rows.map((r, i) => ({ id: r.id, text: r.text, type: r.type, category: r.category, score: 1 - i * 0.01 }));
      return res.json({ ok: true, method: 'text', matches: mapped });
    } catch (err) {
      try { const EventBus = require('../lib/eventBus'); EventBus.emitError({ module: 'rag-query', error: err?.message, stack: err?.stack }); } catch (e) {}
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
