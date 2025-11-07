# BEIT Offline Knowledge Base - Deployment Guide

A fully offline RAG (Retrieval Augmented Generation) system for searching BEIT project insights, curriculum, and metadata.

## 📦 What's Included

- **425 expert insights** from trainer interviews (Solar, Architecture, Insulation modules)
- **Curriculum content** - All training activities, sessions, and homework
- **Project metadata** - Facts about the BEIT program scope and structure
- **Vector embeddings** - Pre-generated using Ollama's nomic-embed-text model
- **Chroma vector database** - Fully seeded and ready to use

## 🎯 System Requirements

### Required Software

1. **Python 3.10+** with pip
   ```bash
   python3 --version
   ```

2. **ChromaDB** (vector database)
   ```bash
   pip install chromadb==1.3.4
   ```

3. **Ollama** (for embeddings)
   - Download from: https://ollama.ai
   - Install `nomic-embed-text` model:
     ```bash
     ollama pull nomic-embed-text
     ```

4. **Node.js 18+** (optional, for web UI)
   ```bash
   node --version
   npm --version
   ```

### System Resources

- **Disk Space**: ~500MB (including vector embeddings)
- **RAM**: 2GB minimum, 4GB recommended
- **CPU**: Any modern processor (embeddings are pre-generated)

## 🚀 Quick Start

### For Windows Users

#### Step 1: Extract the Archive
- Right-click `beit-knowledge-base-offline.zip`
- Select "Extract All..."
- Choose your destination folder
- Open the extracted folder in File Explorer

#### Step 2: Install Dependencies
Open Command Prompt or PowerShell:
```cmd
REM Install Python dependencies
pip install chromadb==1.3.4

REM Install Ollama from https://ollama.ai/download (Windows)
REM After installing Ollama, run:
ollama pull nomic-embed-text

REM Optional: Install Node.js dependencies
npm install
```

#### Step 3: Start the Knowledge Base
Double-click `start.bat` or run in Command Prompt:
```cmd
start.bat
```

#### Query the Knowledge Base
Double-click `query.bat` or run:
```cmd
query.bat "What hands-on activities worked best in training?"
```

#### Stop the Knowledge Base
Double-click `stop.bat` or run:
```cmd
stop.bat
```

---

### For Mac/Linux Users

#### Step 1: Extract the Archive
```bash
cd /path/to/deployment
tar -xzf beit-knowledge-base-offline.tar.gz
cd beit-knowledge-base-offline
```

#### Step 2: Install Dependencies
```bash
# Install Python dependencies
pip install chromadb==1.3.4

# Install Ollama from https://ollama.ai/download
ollama pull nomic-embed-text

# Optional: Install Node.js dependencies
npm install
```

#### Step 3: Start the Knowledge Base
```bash
./start.sh
```

#### Query the Knowledge Base
```bash
./query.sh "What hands-on activities worked best in training?"
```

#### Stop the Knowledge Base
```bash
./stop.sh
```

---

## 🔍 Usage Examples

### Search Examples (Works on Both Windows & Mac)

**Windows:**
```cmd
query.bat "What hands-on activities worked best in training?"
query.bat "What barriers prevent graduates from finding work?"
query.bat "How should we balance theory vs practice?"
```

**Mac/Linux:**
```bash
./query.sh "What hands-on activities worked best in training?"
./query.sh "What barriers prevent graduates from finding work?"
./query.sh "How should we balance theory vs practice?"
```

### Sample Output
```
🔍 Query: "What hands-on activities worked best in training?"

📊 Searching insights...

✅ Found 5 insights:

[1] SOL-023 - Mohammed Al-Najjar (Solar)
    Similarity: 0.847 | Priority: Critical
    Theme: Hands-on practice critical for retention
    Quote: "When students actually wire the panels themselves, they remember...

[2] ARC-015 - Sarah Ahmed (Architecture)
    Similarity: 0.812 | Priority: High
    Theme: Site visits more effective than classroom theory
    Quote: "Taking them to real construction sites changed everything...
```

###Human: continue