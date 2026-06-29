const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgres://harshan:bookgraph123@localhost:5432/bookgraph'
});

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
    return data.embedding;
}

async function searchRelatedConcepts(searchQuery) {
    try {
        await client.connect();
        
        // 1. Convert our search query into a vector embedding
        console.log(`🔍 Generating embedding for search query: "${searchQuery}"`);
        const queryEmbedding = await getEmbedding(searchQuery);
        const vectorString = JSON.stringify(queryEmbedding);

        // 2. Query Postgres using the pgvector distance operator (<=> represents Cosine Distance)
        // We calculate similarity as (1 - distance) so that 1.0 means a perfect match.
        const query = `
            SELECT content, 
                   (1 - (embedding <=> $1::vector)) AS similarity
            FROM concepts
            ORDER BY embedding <=> $1::vector ASC
            LIMIT 3;
        `;

        const res = await client.query(query, [vectorString]);
        
        console.log("\n📊 Top Matches Found in Local Database via Vector Math:");
        console.log("--------------------------------------------------");
        res.rows.forEach((row, index) => {
            console.log(`${index + 1}. [Similarity: ${(row.similarity * 100).toFixed(2)}%]`);
            console.log(`   Content: "${row.content}"\n`);
        });

    } catch (error) {
        console.error("❌ Error running vector search:", error);
    } finally {
        await client.end();
    }
}

// Let's search for something that uses different words but shares the same semantic meaning
searchRelatedConcepts("complex and analytical decision making");