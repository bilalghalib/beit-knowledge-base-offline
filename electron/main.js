import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let nextProcess = null;

// Set default environment variables for the application
// These ensure the app works even without .env.local file
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

// Dependency check placeholder (all core services run in-app now)
async function checkDependencies() {
  return [];
}

// Start Next.js server
async function startNextServer() {
  console.log('🚀 Starting Next.js server...');

  try {
    let serverPath;
    let args;

    if (app.isPackaged) {
      // In production, use the standalone server
      // When asar is disabled, files are in app/ subdirectory
      const standalonePath = path.join(process.resourcesPath, 'app', '.next', 'standalone');
      serverPath = path.join(standalonePath, 'server.js');
      args = [];

      console.log('Production mode - using standalone server');
      console.log('Standalone directory:', standalonePath);
      console.log('Server path:', serverPath);

      // Set required environment variables
      process.env.PORT = '3335';
      process.env.HOSTNAME = 'localhost';

      // Use process.execPath (Electron's bundled Node) instead of 'node'
      // This ensures it works on Windows where 'node' might not be in PATH
      nextProcess = spawn(process.execPath, ['server.js'], {
        cwd: standalonePath, // Run from standalone directory
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        env: {
          ...process.env,
          PORT: '3335',
          HOSTNAME: 'localhost',
          NODE_ENV: 'production',
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
      devTools: !app.isPackaged, // Only enable DevTools in development
    },
    title: 'BEIT Knowledge Base',
    icon: path.join(__dirname, '../public/icon.png'),
  });

  // Open DevTools only in development mode
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  // Show loading screen
  mainWindow.loadFile(path.join(__dirname, 'loading.html'));

  // Dependencies are optional now; skip blocking checks
  const finalIssues = await checkDependencies();
  if (finalIssues.length > 0) {
    console.error('⚠️  Optional dependency notices:', finalIssues);
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
// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit();
} else {
  // This is the first instance, handle second-instance events
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => {
  if (nextProcess) {
    console.log('🛑 Stopping Next.js server...');
    nextProcess.kill();
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
