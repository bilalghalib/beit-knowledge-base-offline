# Deployment Guide

## ✅ Safe to Commit to GitHub

**Source Code & Embeddings (< 100MB each):**
- All `.ts`, `.tsx`, `.js` files
- `data/insights_embedded_1024.json` (14MB)
- `data/curriculum_embedded_1024.json` (3.8MB)  
- `data/metadata_embedded_1024.json` (295KB)
- `data/*_embedded_3072.json` (if you have them from Vercel)

## ❌ Excluded (in .gitignore)

**Models (428MB - too large):**
- `models/transformers/` - Download via `npm run download-transformers-model`

## Deployment Options

### Vercel (Cloud with Smart Degradation)
1. Push to GitHub
2. Vercel auto-deploys
3. Add `OPENAI_API_KEY` in Vercel dashboard (optional)
4. Uses `/api/search-smart`:
   - **With API key**: 3072-dim OpenAI (best)
   - **Without**: 1024-dim Transformers.js (offline)

### Electron (Fully Offline)
```bash
npm run download-transformers-model  # Downloads 428MB models
npm run precompute-embeddings:transformers
npm run electron:build:win  # ~550MB installer
```

## Quick Commands
```bash
git add .
git commit -m "Add Transformers.js offline search"
git push origin main
```

Models will be downloaded when needed via scripts.
