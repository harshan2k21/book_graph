#!/usr/bin/env bash
# BookGraph V2 — One-shot setup script
# Run this once to initialize everything.
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   BookGraph V2 — Setup              ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. Check Docker ──────────────────────────────────────────────────────────
echo "▸ Checking Docker..."
if ! command -v docker &>/dev/null; then
  echo "  ❌ Docker not found. Install Docker and retry."
  exit 1
fi
if ! command -v docker compose &>/dev/null && ! command -v docker-compose &>/dev/null; then
  echo "  ❌ Docker Compose not found. Install Docker Compose and retry."
  exit 1
fi
echo "  ✅ Docker OK"

# ── 2. Start PostgreSQL via Docker Compose ────────────────────────────────────
echo "▸ Starting PostgreSQL with pgvector (Docker Compose)..."
cd "$ROOT"
docker compose up -d postgres 2>&1
echo "  ✅ Postgres container starting..."

# Wait for Postgres to be ready
echo "  ⏳ Waiting for Postgres to be ready..."
for i in $(seq 1 30); do
  if docker exec bookgraph_postgres pg_isready -U postgres &>/dev/null; then
    echo "  ✅ Postgres is ready!"
    break
  fi
  sleep 2
done

# ── 3. Check Ollama ──────────────────────────────────────────────────────────
echo "▸ Checking Ollama..."
if ! curl -sf http://localhost:11434/api/tags &>/dev/null; then
  echo "  ⚠️  Ollama not running. Please start it: 'ollama serve'"
  echo "     Then pull models: 'ollama pull llama3 && ollama pull nomic-embed-text'"
else
  echo "  ✅ Ollama is running"
  # Pull models if not present
  echo "  ▸ Pulling llama3 (this may take a while on first run)..."
  ollama pull llama3 || true
  echo "  ▸ Pulling nomic-embed-text..."
  ollama pull nomic-embed-text || true
fi

# ── 4. Initialize DB ──────────────────────────────────────────────────────────
echo "▸ Initializing database schema..."
cd "$BACKEND"
node initDB.js
echo "  ✅ DB schema ready"

echo ""
echo "✅ Setup complete! Now run:"
echo "   Terminal 1 (backend):  cd backend && npm run dev"
echo "   Terminal 2 (frontend): cd frontend && npm run dev"
echo "   Then open: http://localhost:5173"
echo ""
