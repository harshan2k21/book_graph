const { Client } = require('pg');

// Connect to the local Postgres database you started via Docker
const client = new Client({
    connectionString: 'postgres://harshan:bookgraph123@localhost:5432/bookgraph'
});

// Function to ask Ollama for a vector embedding
async function getEmbedding(text) {
    const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'nomic-embed-text',
            prompt: text
        })
    });
    
    const data = await response.json();
    return data.embedding; // This is the 768-number array
}

async function main() {
    try {
        await client.connect();
        console.log("✅ Connected to PostgreSQL");

        // 1. Enable the pgvector extension and create our table
        await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
        await client.query(`
            CREATE TABLE IF NOT EXISTS concepts (
                id SERIAL PRIMARY KEY,
                content TEXT,
                embedding VECTOR(768) -- nomic-embed-text outputs 768 dimensions
            );
        `);
        console.log("✅ Database table 'concepts' is ready");

        // 2. The text we want to save
        const textToSave = "System 2 thinking is slow, conscious, and effortful.";
        console.log(`\n🧠 Asking Ollama to process: "${textToSave}"`);
        
        // Get the math array from Ollama
        const embeddingArray = await getEmbedding(textToSave);
        console.log(`📊 Received a ${embeddingArray.length}-dimensional vector from Ollama`);

        // 3. Save both the text and the vector to the database
        // pgvector expects the array formatted as a string like '[0.1, 0.2, ...]'
        const vectorString = JSON.stringify(embeddingArray); 
        
        await client.query(
            'INSERT INTO concepts (content, embedding) VALUES ($1, $2)',
            [textToSave, vectorString]
        );

        console.log("💾 Successfully saved the concept and its vector to the database!\n");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await client.end();
    }
}

main();