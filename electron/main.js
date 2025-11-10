import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let nextProcess = null;
let chromaProcess = null;

// Set default environment variables for the application
// These ensure the app works even without .env.local file
process.env.CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
process.env.OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
process.env.OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
process.env.OLLAMA_GENERATE_MODEL = process.env.OLLAMA_GENERATE_MODEL || 'llama3:8b';

// Check if a service is running on a specific port
async function checkService(url, serviceName) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    console.log(`✅ ${serviceName} is running`);
    return { running: true, installed: true };
  } catch (error) {
    console.log(`❌ ${serviceName} check failed: ${error.message}`);
    return { running: false, installed: null };
  }
}

// Check all required dependencies
async function checkDependencies() {
  console.log('🔍 Checking dependencies...');

  const issues = [];

  // Check Ollama
  const ollama = await checkService('http://localhost:11434/api/version', 'Ollama');
  if (!ollama.running) {
    issues.push({
      name: 'Ollama',
      status: 'not_running',
      message: 'Ollama is not running or not installed',
      instructions: [
        '1. Download Ollama from https://ollama.ai',
        '2. Install and start Ollama',
        '3. Run: ollama pull nomic-embed-text',
        '4. Restart this application'
      ]
    });
  }

  // Check ChromaDB
  const chroma = await checkService('http://localhost:8000/api/v1/heartbeat', 'ChromaDB');
  if (!chroma.running) {
    issues.push({
      name: 'ChromaDB',
      status: 'not_running',
      message: 'ChromaDB server is not running',
      instructions: [
        '1. Install ChromaDB: pip install chromadb',
        '2. Start ChromaDB server using start.bat (Windows) or start.sh (Mac/Linux)',
        '3. Restart this application'
      ]
    });
  }

  return issues;
}

// Start ChromaDB server automatically (Windows)
async function startChromaDB() {
  console.log('🚀 Starting ChromaDB server...');

  try {
    // Get the correct path to chroma-storage
    const chromaStoragePath = app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'chroma-storage')
      : path.join(app.getAppPath(), 'chroma-storage');

    console.log('ChromaDB storage path:', chromaStoragePath);

    // Try to start ChromaDB
    const isWindows = process.platform === 'win32';
    const chromaCommand = isWindows ? 'chroma.exe' : 'chroma';

    chromaProcess = spawn(chromaCommand, ['run', '--path', chromaStoragePath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      shell: isWindows
    });

    chromaProcess.stdout.on('data', (data) => {
      console.log(`[ChromaDB] ${data.toString().trim()}`);
    });

    chromaProcess.stderr.on('data', (data) => {
      console.error(`[ChromaDB Error] ${data.toString().trim()}`);
    });

    chromaProcess.on('error', (error) => {
      console.error('Failed to start ChromaDB:', error.message);
      chromaProcess = null;
    });

    chromaProcess.on('exit', (code) => {
      console.log(`ChromaDB process exited with code ${code}`);
      chromaProcess = null;
    });

    // Wait for ChromaDB to be ready (up to 30 seconds)
    console.log('Waiting for ChromaDB to be ready...');
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const result = await checkService('http://localhost:8000/api/v1/heartbeat', 'ChromaDB');
      if (result.running) {
        console.log('✅ ChromaDB server ready!');
        return true;
      }
      if (i % 5 === 0 && i > 0) {
        console.log(`Still waiting for ChromaDB... (${i}s)`);
      }
    }

    throw new Error('ChromaDB failed to start within 30 seconds');
  } catch (error) {
    console.error('Error starting ChromaDB:', error);
    chromaProcess = null;
    return false;
  }
}

// Start Next.js server
async function startNextServer() {
  console.log('🚀 Starting Next.js server...');

  try {
    let serverPath;
    let args;

    if (app.isPackaged) {
      // In production, use the standalone server
      serverPath = path.join(process.resourcesPath, '.next', 'standalone', 'server.js');
      args = [];

      console.log('Production mode - using standalone server');
      console.log('Server path:', serverPath);

      // Set required environment variables
      process.env.PORT = '3335';
      process.env.HOSTNAME = 'localhost';

      nextProcess = spawn('node', [serverPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        env: {
          ...process.env,
          PORT: '3335',
          HOSTNAME: 'localhost',
          NODE_ENV: 'production',
          CHROMA_URL: process.env.CHROMA_URL,
          OLLAMA_URL: process.env.OLLAMA_URL,
          OLLAMA_EMBED_MODEL: process.env.OLLAMA_EMBED_MODEL,
          OLLAMA_GENERATE_MODEL: process.env.OLLAMA_GENERATE_MODEL,
        },
      });
    } else {
      // In development, use npm
      console.log('Development mode - using npm start');

      nextProcess = spawn('npm', ['run', 'start'], {
        cwd: app.getAppPath(),
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        shell: true,
      });
    }

    nextProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      console.log(`[Next.js] ${output}`);
    });

    nextProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      console.error(`[Next.js Error] ${output}`);
    });

    nextProcess.on('error', (error) => {
      console.error('Failed to start Next.js:', error.message);
      mainWindow?.webContents.send('server-error', error.message);
    });

    nextProcess.on('exit', (code) => {
      console.log(`Next.js process exited with code ${code}`);
      nextProcess = null;
    });

    // Wait for Next.js to be ready
    console.log('Waiting for Next.js server to be ready...');
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const isReady = await checkNextStatus();
      if (isReady) {
        console.log('✅ Next.js server ready!');
        return true;
      }
      if (i % 5 === 0) {
        console.log(`Still waiting... (${i}s)`);
      }
    }

    throw new Error('Next.js server failed to start within 60 seconds');
  } catch (error) {
    console.error('Error starting Next.js:', error);
    mainWindow?.webContents.send('server-error', error.message);
    return false;
  }
}

// Check if Next.js is running
function checkNextStatus() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3335,
      path: '/',
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      console.log(`Next.js health check: ${res.statusCode}`);
      // Accept 200 or any 2xx/3xx status
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });

    req.on('error', (err) => {
      console.log(`Next.js health check error: ${err.message}`);
      resolve(false);
    });
    req.on('timeout', () => {
      console.log('Next.js health check timeout');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Create main window
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: !app.isPackaged, // Enable DevTools only in development
    },
    title: 'BEIT Knowledge Base',
    icon: path.join(__dirname, '../public/icon.png'),
  });

  // Open DevTools for debugging (only in development)
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  // Show loading screen
  mainWindow.loadFile(path.join(__dirname, 'loading.html'));

  // Check dependencies first
  const depIssues = await checkDependencies();

  // Try to auto-start ChromaDB if it's not running
  if (depIssues.some(issue => issue.name === 'ChromaDB')) {
    console.log('Attempting to auto-start ChromaDB...');
    await startChromaDB();
  }

  // Re-check dependencies after attempting auto-start
  const finalIssues = await checkDependencies();

  if (finalIssues.length > 0) {
    console.error('⚠️  Missing dependencies:', finalIssues);
    // Send dependency issues to renderer for display
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('dependency-issues', finalIssues);
    });
  }

  // Start Next.js server
  const nextSuccess = await startNextServer();
  if (nextSuccess) {
    mainWindow.loadURL('http://localhost:3335');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'error.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (nextProcess) {
    console.log('🛑 Stopping Next.js server...');
    nextProcess.kill();
  }

  if (chromaProcess) {
    console.log('🛑 Stopping ChromaDB server...');
    chromaProcess.kill();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('check-server-status', async () => {
  return await checkNextStatus();
});

ipcMain.handle('check-dependencies', async () => {
  return await checkDependencies();
});

ipcMain.handle('restart-server', async () => {
  if (nextProcess) {
    nextProcess.kill();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return await startNextServer();
});
