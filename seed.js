const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgres://harshan:bookgraph123@localhost:5432/bookgraph'
});

async function getEmbedding(text) {
    const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'nomic-embed-text', prompt: text })
    });
    const data = await response.json();
    return data.embedding;
}

async function main() {
    try {
        await client.connect();
        console.log("✅ Connected to PostgreSQL");

        // 1. Reset and create the table
        await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
        await client.query('DROP TABLE IF EXISTS concepts;'); // Clear old data
        await client.query(`
            CREATE TABLE concepts (
                id SERIAL PRIMARY KEY,
                content TEXT,
                embedding VECTOR(768)
            );
        `);
        console.log("✅ Database table 'concepts' created");

        // 2. The concepts we want to link
        const concepts = [
            "System 1 thinking is fast, automatic, and highly emotional.",
            "System 2 thinking is slow, conscious, and effortful."
        ];

        // 3. Process and save both
        for (const text of concepts) {
            console.log(`🧠 Generating vector for: "${text}"`);
            const vector = await getEmbedding(text);
            await client.query(
                'INSERT INTO concepts (content, embedding) VALUES ($1, $2)',
                [text, JSON.stringify(vector)]
            );
        }

        console.log("💾 Successfully seeded the database!");
    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await client.end();
        process.exit(0);
    }
}

main();