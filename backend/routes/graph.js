const express = require('express');
const router = express.Router();
const pool = require('../db');

// ─── Connection weights ────────────────────────────────────────────────────────
// Philosophy: themes + emotional tone are the SOUL of a connection.
// Setting overlap is a weak signal. Era is display-only (not embedded).
const WEIGHTS = {
  theme:          0.45,  // Deep thematic overlap — primary signal
  emotional_tone: 0.30,  // Emotional/mood resonance — e.g. "haunting despair" clusters
  style:          0.10,  // Narrative style/genre — secondary signal
  setting:        0.05,  // Geographic setting — very weak, avoid false positives
  same_author:    0.35,  // Flat bonus — guaranteed connection for same-author pairs
};

// Minimum per-type similarity to count (avoids noise from near-zero scores)
const MIN_SIM = 0.10;

// ─── GET /api/graph ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const THRESHOLD = parseFloat(req.query.threshold || '0.55');

  try {
    // ── Fetch all books with their descriptors ────────────────────────────────
    const booksResult = await pool.query(
      `SELECT b.*,
              ARRAY_AGG(t.theme_name ORDER BY t.id) FILTER (WHERE t.theme_type = 'theme')           AS themes,
              MAX(t.theme_name) FILTER (WHERE t.theme_type = 'setting')        AS setting,
              MAX(t.theme_name) FILTER (WHERE t.theme_type = 'era')            AS era,
              MAX(t.theme_name) FILTER (WHERE t.theme_type = 'style')          AS style,
              MAX(t.theme_name) FILTER (WHERE t.theme_type = 'emotional_tone') AS emotional_tone
       FROM books b
       LEFT JOIN themes t ON t.book_id = b.id
       GROUP BY b.id
       ORDER BY b.id`
    );
    const books = booksResult.rows;

    if (books.length < 2) {
      return res.json({ nodes: books, edges: [] });
    }

    // ── Compute per-type pairwise cosine similarities using pgvector ──────────
    // Only for embedded types: theme, emotional_tone, style, setting
    const simResult = await pool.query(
      `SELECT
         ta.book_id                                    AS source_id,
         tb.book_id                                    AS target_id,
         ta.theme_type                                 AS type,
         AVG(1 - (ta.embedding <=> tb.embedding))      AS similarity
       FROM themes ta
       JOIN themes tb
         ON ta.book_id < tb.book_id
        AND ta.theme_type = tb.theme_type
        AND ta.theme_type IN ('theme', 'emotional_tone', 'style', 'setting')
        AND ta.embedding IS NOT NULL
        AND tb.embedding IS NOT NULL
       GROUP BY ta.book_id, tb.book_id, ta.theme_type`
    );

    // ── Pivot into lookup map ─────────────────────────────────────────────────
    const simMap = {};
    for (const row of simResult.rows) {
      const key = `${row.source_id}-${row.target_id}`;
      if (!simMap[key]) simMap[key] = { source: row.source_id, target: row.target_id };
      simMap[key][row.type] = parseFloat(row.similarity);
    }

    // ── Book index ────────────────────────────────────────────────────────────
    const bookById = {};
    for (const b of books) bookById[b.id] = b;

    // ── Compute composite score for every pair ────────────────────────────────
    const edges = [];
    const bookIds = books.map((b) => b.id);

    for (let i = 0; i < bookIds.length; i++) {
      for (let j = i + 1; j < bookIds.length; j++) {
        const srcId = bookIds[i];
        const tgtId = bookIds[j];
        const key = `${srcId}-${tgtId}`;
        const sims = simMap[key] || {};

        const sameAuthor =
          bookById[srcId].author.trim().toLowerCase() ===
          bookById[tgtId].author.trim().toLowerCase();

        // Apply minimum threshold per dimension to reduce noise
        const themeScore  = Math.max(0, (sims.theme          || 0) - MIN_SIM) / (1 - MIN_SIM);
        const toneScore   = Math.max(0, (sims.emotional_tone || 0) - MIN_SIM) / (1 - MIN_SIM);
        const styleScore  = Math.max(0, (sims.style          || 0) - MIN_SIM) / (1 - MIN_SIM);
        const settingScore = Math.max(0, (sims.setting       || 0) - MIN_SIM) / (1 - MIN_SIM);

        const composite = Math.min(
          1.0,
          themeScore   * WEIGHTS.theme          +
          toneScore    * WEIGHTS.emotional_tone  +
          styleScore   * WEIGHTS.style           +
          settingScore * WEIGHTS.setting         +
          (sameAuthor ? WEIGHTS.same_author : 0)
        );

        if (composite < THRESHOLD) continue;

        // ── Determine primary connection reason ───────────────────────────────
        let edgeType = 'theme';
        if (sameAuthor) {
          edgeType = 'author';
        } else if (toneScore > themeScore && toneScore > styleScore) {
          edgeType = 'emotional'; // Mood/tone is the strongest bond
        } else if (styleScore > themeScore) {
          edgeType = 'style';
        }
        // Default stays 'theme' when theme dominates

        // ── Human-readable breakdown ──────────────────────────────────────────
        const breakdown = [
          sameAuthor                         ? `same author`                                          : null,
          sims.theme          ? `theme ${Math.round(sims.theme          * 100)}%` : null,
          sims.emotional_tone ? `mood  ${Math.round(sims.emotional_tone * 100)}%` : null,
          sims.style          ? `style ${Math.round(sims.style          * 100)}%` : null,
        ].filter(Boolean);

        edges.push({
          source:     srcId,
          target:     tgtId,
          similarity: composite.toFixed(3),
          edgeType,
          sameAuthor,
          breakdown,
          scores: {
            theme:          +(sims.theme          || 0).toFixed(3),
            emotional_tone: +(sims.emotional_tone || 0).toFixed(3),
            style:          +(sims.style          || 0).toFixed(3),
            setting:        +(sims.setting        || 0).toFixed(3),
          },
        });
      }
    }

    // Sort by composite score descending
    edges.sort((a, b) => parseFloat(b.similarity) - parseFloat(a.similarity));

    console.log(`📊 Graph: ${books.length} nodes, ${edges.length} edges (threshold=${THRESHOLD})`);
    res.json({ nodes: books, edges });
  } catch (err) {
    console.error('❌ Graph error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
