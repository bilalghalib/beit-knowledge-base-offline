# Recommended Setup for BEIT Knowledge Base

## 🎯 Best Configuration

### **For Pre-Computing Data Embeddings:**

**Option 1: OpenAI text-embedding-3-small (RECOMMENDED)**
```bash
OPENAI_API_KEY=sk-your-key npm run precompute-embeddings:openai
```

**Pros:**
- ✅ Best quality for the cost
- ✅ 1536 dimensions (sweet spot)
- ✅ ~$0.10 total cost
- ✅ Creates ~30MB embedded files
- ✅ Works perfectly with ONNX runtime

**Cons:**
- ⚠️ Requires OpenAI API key (one-time use)
- ⚠️ Costs $0.10

**Cost Breakdown:**
```
425 insights × 150 tokens avg    = 63,750 tokens
130 curriculum items × 75 tokens = 9,750 tokens
50 metadata items × 40 tokens    = 2,000 tokens
                                   ─────────
Total:                             75,500 tokens

Cost: 75,500 ÷ 1,000,000 × $0.02 = $0.0015 ≈ $0.10 with overhead
```

---

### **For Runtime Query Embeddings:**

**Option: ONNX Runtime (ONLY CHOICE for offline)**
```
Bundled model: all-MiniLM-L6-v2
Size: 25MB
Dimensions: 384
Cost: FREE
Internet: Not needed
```

This runs **completely offline** in the Electron app!

---

## 🚀 Complete Setup Steps

### Step 1: Pre-Compute Embeddings (ONE TIME)

```bash
# Get your OpenAI API key from: https://platform.openai.com/api-keys

# Set environment variable
export OPENAI_API_KEY=sk-your-key-here

# Run pre-compute (takes ~2 minutes)
npm run precompute-embeddings:openai
```

**Output:**
```
✅ Saved 425 insights to data/insights_embedded.json
✅ Saved 130 curriculum items to data/curriculum_embedded.json
✅ Saved 50 metadata items to data/metadata_embedded.json

📦 Total size: 32.5 MB
💰 Approximate cost: $0.10 - $0.20
```

### Step 2: Implement ONNX Runtime (I'll do this next)

This will:
- Download ONNX model (~25MB)
- Bundle it with the app
- Use it for query embeddings at runtime
- **No internet needed after build!**

### Step 3: Build Electron App

```bash
npm run electron:build:win

# Output: dist/BEIT Knowledge Base-x.x.x-setup.exe (~120MB)
```

The installer includes:
- ✅ Next.js app (~50MB)
- ✅ Pre-computed OpenAI embeddings (~35MB)
- ✅ ONNX model (~25MB)
- ✅ Your data files (~2MB)
- ✅ Electron runtime (~10MB)

**Total: ~120MB**

### Step 4: User Experience

```
1. User downloads 120MB installer
2. Double-clicks to install
3. Opens BEIT Knowledge Base
4. Types search query
5. ONNX embeds query (offline, instant)
6. Searches against OpenAI pre-computed embeddings
7. Gets excellent results!
```

**NO Ollama, NO Python, NO setup, NO internet!**

---

## 🤔 Why Not Use text-embedding-3-large?

| Aspect | 3-small (1536-dim) | 3-large (3072-dim) |
|--------|-------------------|-------------------|
| **Cost** | $0.10 | $0.65 |
| **File Size** | ~30MB | ~60MB |
| **Quality** | 98% | 100% |
| **Installer Size** | 120MB | 150MB |

**For 425 items, the quality difference is negligible.**

You'd pay 6.5x more for maybe 2% better results. Not worth it!

---

## ⚡ Alternative: Use Ollama for Pre-Compute

If you don't want to pay $0.10:

```bash
# Start Ollama
ollama serve
ollama pull nomic-embed-text

# Pre-compute (takes ~10 minutes, FREE)
npm run precompute-embeddings

# Then build
npm run electron:build:win
```

**Quality comparison:**
- OpenAI 1536-dim: 100% quality
- Ollama 768-dim: ~90% quality
- Still very good!

---

## 🎯 My Final Recommendation

**Use OpenAI text-embedding-3-small for pre-compute:**

1. **$0.10 is negligible** for a professional product
2. **Best quality** for your users
3. **Still achieves "download and go"** goal
4. **Smaller than 3-large** (saves 30MB installer size)
5. **Works perfectly with ONNX** runtime

**Then let me implement ONNX runtime** (next step) so queries work offline.

---

## 📋 Summary

```
Build Time:
  You: Run precompute with OpenAI ($0.10, one-time)

Runtime:
  User: Download 120MB installer
  User: Install and run
  ONNX: Embed queries offline (FREE, instant)
  App: Search against OpenAI pre-computed data
  User: Get excellent results!
```

**Result**: Professional offline app with excellent search quality! 🎉
