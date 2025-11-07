# BEIT Knowledge Base – Offline Edition

Self-hosted, privacy-preserving deployment of the BEIT knowledge base. This build runs entirely on your own hardware using:

- [Ollama](https://ollama.ai) for local LLMs (embeddings + answer synthesis)
- [Chroma](https://www.trychroma.com) as the vector store
- Next.js frontend & API routes (no external services)

Everything runs inside Docker containers (optional manual mode described below). No Supabase, OpenAI, or Anthropic keys are required.

---

## 🚀 Quick Start (Docker Compose)

Prerequisites:
- Docker Desktop (Windows/macOS) or Docker Engine + Compose Plugin (Linux)
- Enough disk space for Ollama models (~4–8 GB depending on models pulled)

Steps:

1. **Clone this repository** (or unpack the offline bundle).
2. **Copy the environment file** and adjust if needed:
   ```bash
   cp .env.local.example .env.local
   ```
   The defaults assume the Docker Compose network URLs; you can leave them as-is.

3. **Pull the Ollama models** (first run only):
   ```bash
   docker run --rm -v ollama-models:/root/.ollama ollama/ollama pull nomic-embed-text
   docker run --rm -v ollama-models:/root/.ollama ollama/ollama pull llama3:8b
   ```

4. **Start the full stack**:
   ```bash
   docker compose up --build
   ```
   The `web` service will wait for Ollama + Chroma, seed the vector store from `./data`, and then start the Next.js server.

5. **Open the app**: http://localhost:3000

To stop everything: `docker compose down`

Volumes `ollama-models` and `chroma-data` persist model weights and vectors between runs.

---

## 🧠 What’s Inside

- `app/` — Next.js UI (search, browse, curriculum views)
- `app/api/*` — API routes rewritten to query Chroma & Ollama
- `data/` — JSON exports (insights, curriculum, metadata facts)
- `scripts/offline/seed.ts` — Seeds Chroma collections from `./data`
- `docker-compose.yml` — Spins up `web`, `chroma`, and `ollama`
- `Dockerfile` — Builds the Next.js production bundle

Collections:
- `insights` — Expert interview quotes, tags, and priorities
- `curriculum` — Day/session activities with rich facilitator notes
- `metadata` — Project facts (counts, module summaries, etc.)

---

## 🔐 Security Notes

- All services bind to `localhost` only (via Docker port maps).
- No external HTTP calls: Ollama and Chroma run on the same machine.
- Seed data lives in `./data`; update these JSON files to refresh content.
- Audit `scripts/offline/seed.ts` to see exactly what’s stored.

---

## 🛠 Manual (non-Docker) Setup

1. Install dependencies:
   ```bash
   npm install
   brew install chroma  # or run the Chroma Docker image manually
   brew install ollama && ollama serve
   ```
2. Pull models:
   ```bash
   ollama pull nomic-embed-text
   ollama pull llama3:8b
   ```
3. Start Chroma server (if running locally without Docker):
   ```bash
   chroma run --path ./chroma-storage
   ```
4. Seed the database:
   ```bash
   npm run seed
   ```
5. Run the app:
   ```bash
   npm run dev
   ```

Update `.env.local` to point at your Chroma/Ollama endpoints if they differ.

---

## 🧪 Testing Updates / Refreshing Data

Whenever you change `data/*.json`:

```bash
docker compose run --rm web npm run seed
```

The script recreates the collections and ingests the new data.

---

## 🙋 FAQ

**How big are the models?**  
`nomic-embed-text` (~1.8 GB) and `llama3:8b` (~4.7 GB). Pull them once; they stay in `ollama-models`.

**Can I use different models?**  
Yes. Update `.env.local` (`OLLAMA_EMBED_MODEL`, `OLLAMA_GENERATE_MODEL`) and pull those models via Ollama.

**Can the UN run this without internet?**  
Yes. Prepare the Docker images and models ahead of time, copy the repository + volumes, and run on an air-gapped machine. The app itself never calls external APIs.

---

## 📄 License / Attribution

Internal use for BEIT project partners. Built with ❤️ by the ITC Iraq team.
