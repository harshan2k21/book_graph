const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

/**
 * Generate a book summary, themes, emotional tone, setting, era, narrative style via llama3.
 * Returns { summary, themes, emotional_tone, setting, era, style }
 */
async function generateSummaryAndThemes(title, author) {
  const prompt = `You are a deep literary analyst. For the book "${title}" by ${author}, analyze it at a deep level and respond ONLY in JSON.

Important rules:
- Themes must be DEEP and SPECIFIC — not surface-level. Avoid generic words like "love", "journey", "adventure".
  Instead use: "intergenerational trauma", "colonial guilt", "redemption through sacrifice", "political oppression", "search for identity", "grief and memory", "human resilience", "empire and power", etc.
- The emotional_tone must capture how the READER FEELS — e.g. "haunting despair", "quiet melancholy", "hopeful resilience", "existential dread", "bittersweet nostalgia".
- If you don't know the book well, still reason carefully from the author and title clues.

{
  "summary": "2-3 sentence summary of the actual book — be accurate and specific",
  "themes": ["theme1", "theme2", "theme3", "theme4", "theme5"],
  "emotional_tone": "the dominant emotional atmosphere of the book (e.g. 'haunting despair and guilt', 'warm melancholy', 'triumphant resilience')",
  "setting": "primary geographic/cultural setting (e.g. 'post-partition India', 'apartheid South Africa', 'rural Tamil Nadu kingdom')",
  "era": "historical period (e.g. 'ancient Tamil Sangam era', '20th-century war', 'contemporary')",
  "style": "narrative style and genre (e.g. 'lyrical historical fiction', 'magical realism', 'introspective literary drama')"
}

Respond ONLY with the JSON above. No extra text.`;

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3',
      prompt,
      stream: false,
      format: 'json',
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama generate failed: ${response.statusText}`);
  }

  const data = await response.json();
  const parsed = JSON.parse(data.response);

  if (
    !parsed.summary ||
    !Array.isArray(parsed.themes) ||
    parsed.themes.length !== 5 ||
    !parsed.setting ||
    !parsed.era ||
    !parsed.style
  ) {
    throw new Error(`Ollama returned unexpected format: ${JSON.stringify(parsed)}`);
  }

  return {
    summary:        parsed.summary,
    themes:         parsed.themes,
    emotional_tone: parsed.emotional_tone || '',
    setting:        parsed.setting,
    era:            parsed.era,
    style:          parsed.style,
  };
}

/**
 * Generate a 768-dimensional embedding for a given text using nomic-embed-text.
 * Returns number[]
 */
async function generateEmbedding(text) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'nomic-embed-text',
      prompt: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama embeddings failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.embedding; // number[]
}

module.exports = { generateSummaryAndThemes, generateEmbedding };
