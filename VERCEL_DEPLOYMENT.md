# Vercel Deployment Guide

## Yes, Same Codebase Works for Both! ✅

Your **single Next.js codebase** works for:
- ✅ **Vercel** (cloud) - Auto-deployed from GitHub
- ✅ **Electron** (desktop) - Bundled as Windows/Mac app
- ✅ **Local dev** - `npm run dev`

The app **automatically detects** what's available and adapts!

---

## How They Differ (Auto-Detected)

| Feature | Vercel (Cloud) | Electron (Desktop) |
|---------|----------------|-------------------|
| **Embeddings** | 1024 + 3072-dim | 1024-dim only |
| **Models** | Downloads on demand | Bundled (428MB) |
| **API Key** | Optional (stored in Vercel) | Optional (stored locally) |
| **Search Quality** | Best (3072) or Good (1024) | Good (1024) |
| **Internet** | Required | Not required |
| **Storage** | ~60MB on Vercel | ~550MB installer |

---

## Deploy to Vercel (5 Minutes)

### 1. Push to GitHub
```bash
git add .
git commit -m "Add smart offline search"
git push origin main
```

### 2. Import to Vercel
1. Go to https://vercel.com/new
2. Select your GitHub repository
3. Click "Import"
4. **Framework Preset:** Next.js (auto-detected)
5. Click "Deploy"

### 3. Add Environment Variables (Optional)
In Vercel Dashboard → Settings → Environment Variables:
```
OPENAI_API_KEY=sk-your-actual-key
```

**What this enables:**
- ✅ With key + 3072 files: **Best quality** (OpenAI 3072-dim)
- ✅ Without key: **Still works!** (Transformers.js 1024-dim)

### 4. Check Your 3072-dim Embeddings
You mentioned they're already on Vercel. If files exist at:
```
data/insights_embedded_3072.json
data/curriculum_embedded_3072.json
data/metadata_embedded_3072.json
```

Then you're done! If not, download from your current deployment.

---

## What Gets Deployed to Vercel

**From GitHub (auto-included):**
- ✅ Source code
- ✅ `data/*_embedded_1024.json` (18MB) - Offline fallback
- ✅ `data/*_embedded_3072.json` (36MB) - OpenAI quality (if in repo)
- ✅ Package dependencies

**NOT included (good!):**
- ❌ `models/transformers/` (428MB) - Too large
- ❌ `node_modules/`
- ❌ `.next/` build cache

**What Vercel does:**
1. Installs dependencies
2. Builds Next.js app
3. If Transformers.js is needed, downloads model on-demand (~100MB)
4. Serves your app at `your-app.vercel.app`

---

## How Smart Search Works on Vercel

```javascript
// /api/search-smart endpoint logic:

1. Check: Do we have 3072-dim files?
   └─ Yes → Check: Do we have OpenAI API key?
      └─ Yes → Use OpenAI 3072-dim ⭐ BEST
      └─ No  → Use Transformers.js 1024-dim ✅ GOOD

2. No 3072 files → Use Transformers.js 1024-dim ✅ GOOD

3. No embeddings at all → Return error ❌
```

**Result:** Your users ALWAYS get a working search, with the best quality available!

---

## Electron Desktop App (Same Code!)

### Build from Same Repo
```bash
# 1. Download models (stays local, not in GitHub)
npm run download-transformers-model

# 2. Ensure embeddings exist
npm run precompute-embeddings:transformers

# 3. Build desktop app
npm run electron:build:win   # Windows
npm run electron:build:mac   # macOS
```

### What Gets Bundled
- ✅ All source code
- ✅ ONNX models (428MB)
- ✅ 1024-dim embeddings (18MB)
- ✅ Next.js server
- ❌ NOT 3072-dim (too large for desktop)

**Output:** `dist/BEIT Knowledge Base-{version}.exe` (~550MB)

---

## Key Differences in Practice

### Vercel (Cloud)
```bash
# User visits: https://your-app.vercel.app
# Experience:
- Fast initial load
- Can use OpenAI quality if API key provided
- Requires internet
- Free hosting (with Vercel limits)
```

### Electron (Desktop)
```bash
# User installs: BEIT-Knowledge-Base.exe
# Experience:
- Works 100% offline
- Good quality (1024-dim)
- One-time 550MB download
- Runs on Windows/Mac
```

---

## Testing Both Locally

### Test Vercel Build
```bash
npm run build
npm run start
# Visit: http://localhost:3335
```

### Test Electron Build
```bash
npm run electron:dev
# Opens desktop window
```

---

## After Deploying to Vercel

### Check Deployment
1. Visit your Vercel URL
2. Open browser console
3. Search for something
4. Look for: `"method": "Transformers.js 1024-dim"` or `"OpenAI 3072-dim"`

### Update Your App
```bash
# Any updates to code:
git push origin main
# Vercel auto-deploys in ~2 minutes
```

---

## Summary

**Same codebase, different deployments:**

| You Write Once | Vercel Gets | Electron Gets |
|----------------|-------------|---------------|
| `/api/search-smart` | ✅ Cloud API | ✅ Local API |
| `data/*_1024.json` | ✅ Uploaded | ✅ Bundled |
| `data/*_3072.json` | ✅ Uploaded | ❌ Skipped |
| `models/` | ⚡ Downloads on demand | ✅ Bundled |

**Result:** 
- 🌐 Vercel users get cloud-based search
- 💻 Desktop users get offline search
- 📝 You maintain one codebase!

---

## Next Steps

1. ✅ Push to GitHub: `git push origin main`
2. ✅ Import to Vercel (5 minutes)
3. ✅ Test at `your-app.vercel.app`
4. ⏭ Build Electron when ready: `npm run electron:build:win`

You're ready to deploy! 🚀
