const express = require('express');
const router = express.Router();
const pool = require('../db');
const { generateSummaryAndThemes, generateEmbedding } = require('../ollamaService');

// ─── Helper: insert a themed embedding ───────────────────────────────────────
async function insertEmbedding(bookId, label, embedding, type) {
  const embStr = `[${embedding.join(',')}]`;
  await pool.query(
    `INSERT INTO themes (book_id, theme_name, embedding, theme_type)
     VALUES ($1, $2, $3::vector, $4)`,
    [bookId, label, embStr, type]
  );
}

// ─── Helper: run full AI analysis and store all descriptors ──────────────────
async function analyzeAndStore(bookId, title, author) {
  // 1. Generate AI analysis
  const { summary, themes, emotional_tone, setting, era, style } =
    await generateSummaryAndThemes(title, author);

  // 2. Generate all embeddings in parallel (up to 7 descriptors)
  const toEmbed = [
    ...themes,                // 5 theme embeddings
    setting,                  // 1 setting embedding
    style,                    // 1 style embedding
    ...(emotional_tone ? [emotional_tone] : []),  // 1 emotional_tone embedding
  ];

  const allEmbeddings = await Promise.all(toEmbed.map((t) => generateEmbedding(t)));

  let idx = 0;

  // 3. Delete old descriptors for this book (for re-analysis)
  await pool.query('DELETE FROM themes WHERE book_id = $1', [bookId]);

  // 4. Save 5 themes
  for (let i = 0; i < themes.length; i++) {
    await insertEmbedding(bookId, themes[i], allEmbeddings[idx++], 'theme');
  }

  // 5. Save setting
  await insertEmbedding(bookId, setting, allEmbeddings[idx++], 'setting');

  // 6. Save style
  await insertEmbedding(bookId, style, allEmbeddings[idx++], 'style');

  // 7. Save emotional_tone (new dimension — captures mood/feel)
  if (emotional_tone) {
    await insertEmbedding(bookId, emotional_tone, allEmbeddings[idx++], 'emotional_tone');
  }

  // NOTE: era is intentionally not embedded (de-weighted per user feedback)
  // We still store it as plain text for display purposes only
  await pool.query(
    `INSERT INTO themes (book_id, theme_name, theme_type)
     VALUES ($1, $2, 'era')`,
    [bookId, era]
  );

  // 8. Update summary in books table
  await pool.query(
    `UPDATE books SET generated_summary = $1 WHERE id = $2`,
    [summary, bookId]
  );

  return { summary, themes, emotional_tone, setting, era, style };
}

// ─── POST /api/books — Add a new book ────────────────────────────────────────
router.post('/', async (req, res) => {
  const { title, author, status = 'want_to_read', rating } = req.body;

  if (!title || !author) {
    return res.status(400).json({ error: 'title and author are required' });
  }

  try {
    console.log(`📚 Analyzing "${title}" by ${author}...`);

    // Step 1: Save book shell first (to get an id)
    const bookResult = await pool.query(
      `INSERT INTO books (title, author, status, rating)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, author, status, rating || null]
    );
    const book = bookResult.rows[0];

    // Step 2: Run AI analysis and store all embeddings
    const { summary, themes, emotional_tone, setting, era, style } =
      await analyzeAndStore(book.id, title, author);

    console.log(
      `✅ "${title}" analyzed | themes: [${themes.join(', ')}] | tone: "${emotional_tone}" | setting: ${setting}`
    );

    res.status(201).json({
      book: { ...book, generated_summary: summary },
      themes,
      emotional_tone,
      context: { setting, era, style },
    });
  } catch (err) {
    console.error('❌ Error adding book:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/books/:id/reanalyze — Re-run AI on an existing book ───────────
// Useful when the original analysis was wrong (e.g. wrong themes)
router.post('/:id/reanalyze', async (req, res) => {
  const { id } = req.params;

  try {
    const bookResult = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    const book = bookResult.rows[0];

    console.log(`🔄 Re-analyzing "${book.title}" by ${book.author}...`);
    const result = await analyzeAndStore(book.id, book.title, book.author);

    console.log(
      `✅ Re-analysis done | themes: [${result.themes.join(', ')}] | tone: "${result.emotional_tone}"`
    );

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('❌ Error re-analyzing book:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/books — List all books ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*,
              ARRAY_AGG(t.theme_name ORDER BY t.id) FILTER (WHERE t.theme_type = 'theme')          AS themes,
              MAX(t.theme_name) FILTER (WHERE t.theme_type = 'setting')       AS setting,
              MAX(t.theme_name) FILTER (WHERE t.theme_type = 'era')           AS era,
              MAX(t.theme_name) FILTER (WHERE t.theme_type = 'style')         AS style,
              MAX(t.theme_name) FILTER (WHERE t.theme_type = 'emotional_tone') AS emotional_tone
       FROM books b
       LEFT JOIN themes t ON t.book_id = b.id
       GROUP BY b.id
       ORDER BY b.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching books:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/books/:id — Update status or rating ──────────────────────────
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, rating } = req.body;

  try {
    const result = await pool.query(
      `UPDATE books SET
         status = COALESCE($1, status),
         rating = COALESCE($2, rating)
       WHERE id = $3
       RETURNING *`,
      [status || null, rating || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Book not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/books/:id ────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM books WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
