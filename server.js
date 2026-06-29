const express = require('express');
const cors = require('cors');
const { Client } = require('pg');

const app = express();
app.use(cors());
app.use(express.json()); // NEW: This allows Express to read JSON data sent from React

const client = new Client({
    connectionString: 'postgres://harshan:bookgraph123@localhost:5432/bookgraph'
});

// GET ROUTE: Fetch the whole graph
app.get('/api/graph', async (req, res) => {
    try {
        const nodesRes = await client.query('SELECT id, content FROM concepts');
        const nodes = nodesRes.rows.map(row => ({
            id: `concept-${row.id}`,
            title: `Concept ${row.id}`,
            summary: row.content,
            type: 'concept'
        }));

        const linksQuery = `
            SELECT 
                a.id as source_id, 
                b.id as target_id, 
                (1 - (a.embedding <=> b.embedding)) as similarity
            FROM concepts a
            JOIN concepts b ON a.id < b.id
            WHERE (1 - (a.embedding <=> b.embedding)) > 0.50
        `;
        
        const linksRes = await client.query(linksQuery);
        const links = linksRes.rows.map(row => ({
            source: `concept-${row.source_id}`,
            target: `concept-${row.target_id}`,
            value: 2,
            similarity: (row.similarity * 100).toFixed(2) + '%'
        }));

        res.json({ nodes, links });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch graph data" });
    }
});

// NEW POST ROUTE: Receive new text, generate vector, save to DB
app.post('/api/concept', async (req, res) => {
    const { content } = req.body;
    
    if (!content) {
        return res.status(400).json({ error: "Content is required" });
    }

    try {
        console.log(`\n🧠 Processing new input: "${content}"`);
        
        // 1. Get embedding from Ollama
        const ollamaRes = await fetch('http://localhost:11434/api/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'nomic-embed-text', prompt: content })
        });
        const ollamaData = await ollamaRes.json();
        const embedding = ollamaData.embedding;

        // 2. Save to PostgreSQL
        await client.query(
            'INSERT INTO concepts (content, embedding) VALUES ($1, $2)',
            [content, JSON.stringify(embedding)]
        );

        console.log("💾 Saved successfully!");
        res.status(201).json({ success: true });

    } catch (error) {
        console.error("❌ Failed to add concept:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Start the server
client.connect()
    .then(() => {
        console.log("✅ Connected to PostgreSQL");
        app.listen(3000, () => {
            console.log("🚀 API Server running at http://localhost:3000");
        });
    })
    .catch(err => {
        console.error("❌ CRITICAL: Failed to connect to database!", err.message);
        process.exit(1);
    });