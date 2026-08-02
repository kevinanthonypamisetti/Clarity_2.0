const express = require('express');
const axios = require('axios');

const router = express.Router();

function makeRequestId() { return `${Date.now()}-${Math.random().toString(36).slice(2,9)}`; }

// Simple normalized error helper
function providerError(provider, err) {
  return { error: { provider, message: err?.message || String(err), code: err?.code || 'provider_error' } };
}

// Providers list
router.get('/providers', (req, res) => {
  res.json({ ok: true, providers: ['openai', 'local'] });
});

router.get('/health', async (req, res) => {
  const ok = !!process.env.OPENAI_API_KEY;
  res.json({ ok: true, providers: { openai: ok ? 'ok' : 'missing_key' } });
});

// POST /api/chat
// body: { provider, messages, stream }
router.post('/chat', async (req, res) => {
  const id = makeRequestId();
  const { provider = 'openai', messages = [], stream = true, model } = req.body || {};
  const start = Date.now();

  if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages must be an array' });

  try {
    if (provider === 'openai') {
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured' });

      const url = 'https://api.openai.com/v1/chat/completions';
      const modelName = model || process.env.OPENAI_MODEL || 'gpt-4o-mini';

      if (stream) {
        // Stream via SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders && res.flushHeaders();

        const resp = await axios.post(url, { model: modelName, messages, stream: true }, {
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
          responseType: 'stream',
          timeout: 0
        });

        // Pipe provider stream chunks to client as SSE data events
        resp.data.on('data', chunk => {
          const s = chunk.toString('utf8');
          // Forward raw chunk; ensure SSE framing
          try {
            // Some providers already include "data: " markers. If not, send as data.
            if (s.startsWith('data:')) {
              res.write(s + '\n');
            } else {
              s.split('\n').forEach(line => {
                if (line.trim().length === 0) return;
                res.write(`data: ${line}\n\n`);
              });
            }
          } catch (e) {
            // ignore write errors
          }
        });

        resp.data.on('end', () => {
          const latency = Date.now() - start;
          res.write('event: done\n');
          res.write(`data: ${JSON.stringify({ ok: true, id, latency })}\n\n`);
          try { res.end(); } catch (e) {}
        });

        resp.data.on('error', err => {
          const info = providerError('openai', err);
          res.write(`event: error\n`);
          res.write(`data: ${JSON.stringify(info)}\n\n`);
          try { res.end(); } catch (e) {}
        });

        return; // streaming response handled
      } else {
        // non-streaming
        const r = await axios.post(url, { model: modelName, messages }, { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } });
        const latency = Date.now() - start;
        return res.json({ ok: true, id, latency, provider: 'openai', data: r.data });
      }
    }

    // local provider: simple echo/summary
    if (provider === 'local') {
      const combined = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders && res.flushHeaders();
        const text = `Local summary:\n${combined.slice(0, 1000)}`;
        // naive chunking
        const chunkSize = 120;
        for (let i = 0; i < text.length; i += chunkSize) {
          res.write(`data: ${text.slice(i, i + chunkSize)}\n\n`);
        }
        res.write('event: done\n');
        res.write(`data: ${JSON.stringify({ ok: true, id, latency: Date.now() - start })}\n\n`);
        res.end();
        return;
      }
      return res.json({ ok: true, provider: 'local', id, data: combined });
    }

    return res.status(400).json({ error: 'unknown provider' });
  } catch (err) {
    try {
      const EventBus = require('../lib/eventBus');
      EventBus.emitError({ module: 'chat-route', error: err?.message, stack: err?.stack });
    } catch (e) { /* ignore */ }
    return res.status(500).json(providerError(provider, err));
  }
});

module.exports = router;
