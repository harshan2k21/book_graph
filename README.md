<<<<<<< Updated upstream
# book_graph
=======
# 📚 BookGraph V2

BookGraph is an AI-powered personal library cataloging and discovery application. It automatically analyzes your books and organizes them into a beautiful, interactive 2D graph network based on deep thematic, emotional, and narrative connections.

Instead of relying on basic categorical filters or tag-matching, BookGraph uses **vector search and semantic similarity** to map the "soul" of your library.

---

## 🌟 Key Features

- 🧠 **Local AI Literary Analysis**: Powered by **Llama 3** running locally via Ollama. It automatically extracts 2-3 sentence summaries, 5 specific thematic descriptors, setting, historical era, narrative style, and emotional tone for every book you add.
- 📐 **Vector Embeddings**: Uses the **nomic-embed-text** model via Ollama to generate 768-dimensional embeddings for themes, style, setting, and emotional tone.
- ⚡ **Vector Database**: Leverages **PostgreSQL** with the **pgvector** extension and `ivfflat` indexing for high-speed cosine similarity calculations.
- 🕸️ **Weighted Network Visualization**: Generates a custom-weighted connections graph using the following formulation:
  - **Themes** (Deep thematic overlap): `45%`
  - **Emotional Tone** (Mood & reader feelings): `30%`
  - **Style** (Narrative approach & genre): `10%`
  - **Setting** (Geographic/cultural overlap): `5%`
  - **Author Bonus** (Flat similarity bonus for same author): `+35%`
- 🔄 **Re-Analysis Engine**: Trigger on-demand AI analysis/re-embeddings directly from the user interface to refine literary connections.
- 🎨 **Glassmorphic UI**: Beautiful, modern dashboard with responsive control panels, graph filters, and dynamic visualization.

---

## 🛠️ Tech Stack

- **Frontend**: React, Vite, D3-Force (for graph physics layout), Vanilla CSS
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with `pgvector`
- **AI Infrastructure**: Ollama (Llama 3, Nomic Embed Text)
- **Containerization**: Docker Compose (for the vector DB)

---

## 📁 Project Structure

```text
├── backend/
│   ├── routes/
│   │   ├── books.js           # Book CRUD & AI analysis triggers
│   │   └── graph.js           # Multi-dimensional vector similarity engine
│   ├── db.js                  # PostgreSQL pool configuration
│   ├── initDB.js              # Database initialization & migrations
│   ├── ollamaService.js       # Ollama API wrapper for summaries/embeddings
│   ├── package.json
│   └── index.js               # Express application entrypoint
├── frontend/
│   ├── src/
│   │   ├── components/        # Graph and dashboard components
│   │   ├── index.css          # Core design system
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml         # Container configuration for postgres+pgvector
├── setup.sh                   # Autopilot initialization script
└── README.md                  # Project documentation (this file)
```

---

## 🚀 Setup & Installation

### 1. Prerequisites
Ensure you have the following installed on your system:
- **Node.js** (v18+)
- **Docker** and **Docker Compose**
- **Ollama** (Running locally on your system)

### 2. Autopilot Setup
Run the included one-shot setup script to start the PostgreSQL container, pull Ollama models, and initialize database tables:
```bash
chmod +x setup.sh
./setup.sh
```
*Note: If `./setup.sh` errors out due to your Docker configuration, manually follow the step-by-step setup below.*

### 3. Step-by-Step Manual Setup

#### A. Start Vector Database
Launch the database container:
```bash
docker-compose up -d postgres
```

#### B. Configure Ollama
Verify Ollama is running and pull the required models:
```bash
# Start Ollama service if not already running
ollama serve

# Pull models
ollama pull llama3
ollama pull nomic-embed-text
```

#### C. Backend Configuration & Startup
1. Enter the `backend/` directory and copy the environment template:
   ```bash
   cd backend
   cp .env.example .env  # Or create one with details below
   ```
2. Make sure your `.env` contains:
   ```env
   PORT=3001
   DATABASE_URL=postgresql://postgres:postgres@localhost:5433/bookgraph
   OLLAMA_BASE_URL=http://localhost:11434
   ```
3. Install dependencies and initialize the database schema:
   ```bash
   npm install
   npm run db:init
   ```
4. Start the backend developer server:
   ```bash
   npm run dev
   ```

#### D. Frontend Configuration & Startup
1. Enter the `frontend/` directory:
   ```bash
   cd ../frontend
   npm install
   ```
2. Start the Vite dev server:
   ```bash
   npm run dev
   ```
3. Open **[http://localhost:5173](http://localhost:5173)** in your browser!

---

## 📡 API Reference

### Books API (`/api/books`)
- `GET /api/books` - Returns list of all books with their AI-extracted descriptors.
- `POST /api/books` - Adds a new book. Triggers llama3 summary + theme extraction, then fetches vector embeddings and saves everything.
- `PATCH /api/books/:id` - Update reading status or personal rating.
- `DELETE /api/books/:id` - Deletes a book and all its associated descriptors.
- `POST /api/books/:id/reanalyze` - Re-triggers LLM parsing and embeds the book again (useful if original LLM output was suboptimal).

### Graph API (`/api/graph`)
- `GET /api/graph?threshold=0.55` - Returns nodes (books) and edges (similarity-based connections) using the composite weighting algorithm.
>>>>>>> Stashed changes
