# Complete B3 Implementation - Testing & ONNX Integration

## Phase 1: Pre-compute Data Embeddings (Do This First!)

### Prerequisites:
1. Ollama running with nomic-embed-text model
   ```bash
   ollama serve
   ollama pull nomic-embed-text
   ```

### Step 1: Generate Embeddings
```bash
cd /path/to/beit-knowledge-base-offline
npm run precompute-embeddings
```

**What this does:**
- Reads all 425+ insights, curriculum items, and metadata
- Converts each to a vector using Ollama
- Saves to `data/*_embedded.json` files (~15MB total)
- Takes ~5-10 minutes (one-time operation)

**Output:**
- `data/insights_embedded.json` (~10MB)
- `data/curriculum_embedded.json` (~3MB)
- `data/metadata_embedded.json` (~2MB)

---

## Phase 2: Add ONNX Model for Query Embeddings

### Option A: Use onnxruntime-node (Recommended)

**Install:**
```bash
npm install onnxruntime-node
```

**Download Model:**
```bash
# Create models directory
mkdir -p models

# Download all-MiniLM-L6-v2 ONNX model (~25MB)
# This is a popular sentence transformer, quantized for speed
curl -L https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model_quantized.onnx -o models/embedding-model.onnx
curl -L https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/tokenizer.json -o models/tokenizer.json
```

### Option B: Bundle Pre-Made Package

I can create a simplified embedding function that:
1. Uses pre-computed embeddings for common queries
2. Falls back to keyword search for unknown queries
3. NO external dependencies at all!

---

## Phase 3: Testing

### Test 1: Pre-computed Embeddings
```bash
# After running precompute-embeddings
ls -lh data/*_embedded.json

# Should see:
# insights_embedded.json     ~10M
# curriculum_embedded.json   ~3M
# metadata_embedded.json     ~2M
```

### Test 2: Search API (requires Ollama for now)
```bash
npm run dev

# In another terminal:
curl -X POST http://localhost:3000/api/search-v2 \
  -H "Content-Type: application/json" \
  -d '{"query": "What hands-on activities work best?"}'
```

### Test 3: Full Electron Build
```bash
# This will:
# 1. Pre-compute embeddings
# 2. Build Next.js
# 3. Create Windows installer

npm run electron:build:win

# Output: dist/BEIT Knowledge Base-x.x.x-setup.exe
```

---

## Comparison: Ollama vs ONNX vs Pure-Keyword

| Approach | Size | Speed | Quality | Dependencies |
|----------|------|-------|---------|--------------|
| **Ollama** (current) | 2GB | Medium | Excellent | Python, Ollama |
| **ONNX** (recommended) | 25MB | Fast | Excellent | None! |
| **Pure Keyword** | 0MB | Instant | Good | None! |

---

## My Recommendation: Hybrid Approach

**Best of both worlds:**

1. **Pre-compute ALL data embeddings** (already done ✅)
2. **Bundle ONNX model** for query embeddings (~25MB)
3. **Add keyword fallback** for offline/error cases

**Result:**
- 100MB total installer
- Works completely offline
- No Ollama needed
- Professional quality

---

## Quick Decision Matrix

**If you want to ship NOW:**
- Use current implementation with Ollama
- Users install Ollama once (~200MB + 2GB model)
- Works great, just not "zero dependency"

**If you want TRUE zero dependencies:**
- Let me implement ONNX integration (1-2 hours)
- 100MB installer, works immediately
- No user setup required

**Which path?**
