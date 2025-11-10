# BEIT Knowledge Base - Windows Setup Guide

This guide will help you install and run the BEIT Knowledge Base application on Windows.

## 📋 Prerequisites

Before installing the BEIT Knowledge Base, you need to install these free applications:

### 1. Python (Required)
- **Download**: https://www.python.org/downloads/
- **Version**: Python 3.10 or newer
- **Important**: During installation, check ✅ "Add Python to PATH"
- **Verify installation**: Open Command Prompt and type:
  ```cmd
  python --version
  ```
  You should see something like "Python 3.10.x" or newer

### 2. Ollama (Required)
- **Download**: https://ollama.ai/download
- **Size**: ~200 MB installer
- **Purpose**: Provides AI embeddings for semantic search
- **Installation**:
  1. Download the Windows installer
  2. Run the installer (admin rights required)
  3. Ollama will start automatically in the background
- **Verify installation**: Open Command Prompt and type:
  ```cmd
  ollama --version
  ```

### 3. ChromaDB (Required)
- **Install via Command Prompt**:
  ```cmd
  pip install chromadb
  ```
- **Verify installation**: Type:
  ```cmd
  chroma --version
  ```

## 🚀 Installation Steps

### Step 1: Download the Application

Download `BEIT Knowledge Base-x.x.x-setup.exe` from your distribution source.

### Step 2: Run the Installer

1. Double-click the `.exe` file
2. If Windows SmartScreen appears, click "More info" → "Run anyway"
3. Choose installation directory (default: `C:\Users\YourName\AppData\Local\Programs\beit-knowledge-base`)
4. Create desktop shortcut (recommended)
5. Click "Install"

### Step 3: Download AI Models

**IMPORTANT**: Before first use, you must download the AI embedding model (~1.8 GB)

Open Command Prompt and run:
```cmd
ollama pull nomic-embed-text
```

This will take 5-10 minutes depending on your internet speed.

### Step 4: Start ChromaDB Server

The application requires ChromaDB to be running. You have two options:

#### Option A: Auto-start (Recommended)
The application will automatically try to start ChromaDB when you launch it. Just proceed to Step 5.

#### Option B: Manual start
If auto-start doesn't work, open Command Prompt and navigate to the installation folder:
```cmd
cd %LOCALAPPDATA%\Programs\beit-knowledge-base
chroma run --path ./chroma-storage
```

Keep this window open while using the application.

### Step 5: Launch the Application

Double-click the "BEIT Knowledge Base" icon on your desktop or find it in the Start Menu.

## ✅ First-Time Setup Check

When you first launch the application, it will check for required dependencies:

- ✅ **Ollama running** - Should show green
- ✅ **ChromaDB running** - Should show green or auto-start
- ✅ **nomic-embed-text model** - Must be downloaded (see Step 3)

If any dependency is missing, the application will show you specific instructions to fix it.

## 🔍 Using the Application

1. The application opens in a desktop window
2. You'll see a search interface in Arabic (default) or English
3. Type your question in the search box
4. Click "Search" or press Enter
5. Results will appear with:
   - **Insights** from trainer interviews
   - **Curriculum** content from training modules
   - **Metadata** about the project

### Example Searches

Try these sample questions:
- "What hands-on activities worked best in training?"
- "What barriers prevent graduates from finding work?"
- "How should we balance theory vs practice?"

## ⚙️ Settings

Click the gear icon (⚙️) to configure:
- **OpenAI API Key** (optional): For faster/better AI answers using ChatGPT instead of local Ollama
- **Language**: Switch between Arabic and English

## 🛠️ Troubleshooting

### Problem: Application won't start

**Solution**:
1. Check if Python is installed: `python --version`
2. Check if Ollama is running: Look for Ollama icon in system tray (bottom-right)
3. Restart Ollama: Right-click tray icon → Quit, then restart from Start Menu

### Problem: "ChromaDB not running" error

**Solution**:
1. Install ChromaDB: `pip install chromadb`
2. Open Command Prompt
3. Navigate to: `cd %LOCALAPPDATA%\Programs\beit-knowledge-base`
4. Run: `chroma run --path ./chroma-storage`
5. Keep window open, restart application

### Problem: "Model not found" error

**Solution**:
You didn't download the embedding model. Run:
```cmd
ollama pull nomic-embed-text
```
Wait for download to complete (1.8 GB), then restart application.

### Problem: Search is very slow

**Possible causes**:
1. **First search** - Ollama loads model into RAM (takes 10-20 seconds)
2. **Low RAM** - Need at least 4GB free RAM
3. **Ollama not responding** - Restart Ollama from system tray

**Solution**: Subsequent searches should be much faster (1-3 seconds)

### Problem: No results found

**Possible causes**:
1. Query too short (must be at least 2 characters)
2. Query in different language (try Arabic if you searched in English)
3. ChromaDB database not seeded

**Solution**: Try rephrasing your question or use example queries above

## 📊 System Requirements

### Minimum:
- **OS**: Windows 10 or 11 (64-bit)
- **RAM**: 4 GB (8 GB recommended)
- **Disk Space**: 3 GB free
  - 200 MB: Application
  - 1.8 GB: nomic-embed-text model
  - 500 MB: ChromaDB data
  - 500 MB: Working space
- **Internet**: Only for initial setup (downloading models)

### After Setup:
The application works **completely offline** - no internet connection required!

## 🔄 Updates

To update the application:
1. Download the new installer
2. Run it (will replace the old version)
3. Your data and settings are preserved

## ❓ Getting Help

If you encounter issues not covered here:

1. **Check the logs**: Look in `%LOCALAPPDATA%\Programs\beit-knowledge-base\logs\`
2. **Restart everything**:
   - Close application
   - Stop ChromaDB (Ctrl+C in its Command Prompt)
   - Quit Ollama (system tray → right-click → Quit)
   - Restart Ollama
   - Restart application

3. **Reinstall dependencies**:
   ```cmd
   pip uninstall chromadb
   pip install chromadb
   ollama pull nomic-embed-text
   ```

## 🎓 Training Workshop Use

For training facilitators:

### Pre-workshop Setup (1 hour before):
1. Install all prerequisites on workshop computers
2. Download models: `ollama pull nomic-embed-text`
3. Test searches to warm up the system
4. Keep ChromaDB running

### During Workshop:
- Participants can search immediately
- First search takes 10-20 seconds (model loading)
- Subsequent searches are fast (1-3 seconds)
- Show both Arabic and English interfaces
- Demonstrate different query types

### Post-workshop:
- Application can be left installed for continued use
- No ongoing internet or license costs
- Data remains private on local computers

## 📝 License

This application is for use in the BEIT (Building Energy Innovation Training) program. Contact your program administrator for licensing questions.

---

**Version**: 0.1.0
**Last Updated**: November 2025
**Support**: Contact your BEIT program administrator
