const express = require('express');
const router = express.Router();

module.exports = function (pool) {
  router.get('/status', async (req, res) => {
    const providerHealth = {
      openai: !!process.env.OPENAI_API_KEY ? 'ok' : 'missing_key',
      local: 'ok'
    };

    const fallbackStatus = {
      ok: true,
      db: {
        connected: false,
        memoryCount: 0,
        table: 'memories',
        message: process.env.DATABASE_URL ? 'Unable to query the database' : 'DATABASE_URL not configured'
      },
      searchIndex: {
        type: 'pgvector',
        status: process.env.DATABASE_URL ? 'unavailable' : 'disabled'
      },
      providers: providerHealth,
      uptime: process.uptime()
    };

    if (!process.env.DATABASE_URL) {
      return res.json(fallbackStatus);
    }

    try {
      const result = await pool.query('SELECT COUNT(*)::int AS memory_count FROM memories');
      const memoryCount = result.rows?.[0]?.memory_count ?? 0;

      res.json({
        ok: true,
        db: {
          connected: true,
          memoryCount,
          table: 'memories'
        },
        searchIndex: {
          type: 'pgvector',
          status: 'available'
        },
        providers: providerHealth,
        uptime: process.uptime()
      });
    } catch (err) {
      res.json({
        ok: true,
        db: {
          connected: false,
          memoryCount: 0,
          table: 'memories',
          message: err.message
        },
        searchIndex: {
          type: 'pgvector',
          status: 'unavailable'
        },
        providers: providerHealth,
        uptime: process.uptime()
      });
    }
  });

  router.post('/rebuild', async (req, res) => {
    // No real index rebuild implemented yet; stubbed for console actions.
    res.json({ ok: true, message: 'Rebuild queued. This is a placeholder action for the MVP console.' });
  });

  router.post('/clear-cache', async (req, res) => {
    res.json({ ok: true, message: 'Cache cleared. This is a placeholder action for the MVP console.' });
  });

  return router;
};