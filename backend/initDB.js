require('dotenv').config();
const pool = require('./db');

async function initDB() {
  const client = await pool.connect();
  try {
    console.log('🔧 Initializing database...');

    // Enable pgvector extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log('✅ pgvector extension enabled');

    // Books table
    await client.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'want_to_read',
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        generated_summary TEXT,
        cover_color TEXT DEFAULT '#6366f1',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ books table ready');

    // Themes table with pgvector embedding column
    await client.query(`
      CREATE TABLE IF NOT EXISTS themes (
        id SERIAL PRIMARY KEY,
        book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        theme_name TEXT NOT NULL,
        embedding vector(768),
        theme_type TEXT NOT NULL DEFAULT 'theme'
      );
    `);
    console.log('✅ themes table ready');

    // Migration: add theme_type column if upgrading from older schema
    await client.query(`
      ALTER TABLE themes ADD COLUMN IF NOT EXISTS theme_type TEXT NOT NULL DEFAULT 'theme';
    `);
    console.log('✅ theme_type column ensured');

    // Index for fast cosine similarity search
    await client.query(`
      CREATE INDEX IF NOT EXISTS themes_embedding_idx
      ON themes USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 10);
    `);
    console.log('✅ vector index ready');

    console.log('🎉 Database initialization complete!');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

initDB()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
