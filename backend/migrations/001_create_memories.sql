-- Create extensions commonly used for vector storage and UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- Memories table: stores both a pgvector column (optional) and a JSON copy of embeddings
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  type TEXT,
  category TEXT,
  embedding VECTOR(1536), -- optional: fill this when you want real vector search
  embedding_json JSONB,   -- fallback / portable storage of the embedding
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helpful index for text fallbacks
CREATE INDEX IF NOT EXISTS idx_memories_user_created ON memories (user_id, created_at DESC);
