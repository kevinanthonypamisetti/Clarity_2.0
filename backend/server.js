const express = require('express');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend pages from the public folder
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Attach routes (lazy require to pass pool)
const ragRouterFactory = require('./routes/rag');
app.use('/api', ragRouterFactory(pool));

// Chat proxy
const chatRouter = require('./routes/chat');
app.use('/api', chatRouter);

// Admin routes
const adminRouterFactory = require('./routes/admin');
app.use('/api/admin', adminRouterFactory(pool));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/secret-admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 3000;
const EventBus = require('./lib/eventBus');

app.listen(port, () => {
  // emit debug via server event bus
  try {
    EventBus.emitDebug({ module: 'server', message: `Clarity backend listening on port ${port}`, timestamp: Date.now() });
  } catch (e) { /* noop */ }
});
