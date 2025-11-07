import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let chromaProcess = null;
let nextProcess = null;

// Check if Chroma is running
function checkChromaStatus() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/v2/heartbeat',
      method: 'GET',
      timeout: 2000,
    };

    const req = http.request(options, (res) => {
      console.log(`Chroma health check: ${res.statusCode}`);
      resolve(res.statusCode === 200);
    });

    req.on('error', (err) => {
      console.log(`Chroma health check error: ${err.message}`);
      resolve(false);
    });
    req.on('timeout', () => {
      console.log('Chroma health check timeout');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Start Chroma server
async function startChromaServer() {
  const isRunning = await checkChromaStatus();
  if (isRunning) {
    console.log('✅ Chroma server already running');
    return true;
  }

  const chromaPath = path.join(app.getAppPath(), 'chroma-storage');

  console.log('🚀 Starting Chroma server...');
  console.log('   Storage path:', chromaPath);

  try {
    chromaProcess = spawn('chroma', ['run', '--path', `"${chromaPath}"`], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      shell: true,
      env: { ...process.env },
    });

    chromaProcess.stdout.on('data', (data) => {
      console.log(`[Chroma] ${data.toString().trim()}`);
    });

    chromaProcess.stderr.on('data', (data) => {
      console.error(`[Chroma Error] ${data.toString().trim()}`);
    });

    chromaProcess.on('error', (error) => {
      console.error('Failed to start Chroma:', error.message);
      mainWindow?.webContents.send('chroma-error', error.message);
    });

    chromaProcess.on('exit', (code) => {
      console.log(`Chroma process exited with code ${code}`);
      chromaProcess = null;
    });

    // Wait for Chroma to be ready
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const isReady = await checkChromaStatus();
      if (isReady) {
        console.log('✅ Chroma server ready!');
        return true;
      }
    }

    throw new Error('Chroma server failed to start within 30 seconds');
  } catch (error) {
    console.error('Error starting Chroma:', error);
    return false;
  }
}

// Start Next.js server
async function startNextServer() {
  console.log('🚀 Starting Next.js server...');

  try {
    const appPath = app.isPackaged ? process.resourcesPath : app.getAppPath();

    nextProcess = spawn('npm', ['run', 'start'], {
      cwd: appPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      shell: true,
    });

    nextProcess.stdout.on('data', (data) => {
      console.log(`[Next.js] ${data.toString().trim()}`);
    });

    nextProcess.stderr.on('data', (data) => {
      console.error(`[Next.js Error] ${data.toString().trim()}`);
    });

    nextProcess.on('error', (error) => {
      console.error('Failed to start Next.js:', error.message);
    });

    nextProcess.on('exit', (code) => {
      console.log(`Next.js process exited with code ${code}`);
      nextProcess = null;
    });

    // Wait for Next.js to be ready
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const isReady = await checkNextStatus();
      if (isReady) {
        console.log('✅ Next.js server ready!');
        return true;
      }
    }

    throw new Error('Next.js server failed to start within 30 seconds');
  } catch (error) {
    console.error('Error starting Next.js:', error);
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
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: true, // Enable DevTools for debugging
    },
    title: 'BEIT Knowledge Base',
    icon: path.join(__dirname, '../public/icon.png'),
  });

  // Open DevTools for debugging
  mainWindow.webContents.openDevTools();

  // Show loading screen
  mainWindow.loadFile(path.join(__dirname, 'loading.html'));

  // Start Chroma server and Next.js
  startChromaServer().then(async (chromaSuccess) => {
    if (!chromaSuccess) {
      mainWindow.loadFile(path.join(__dirname, 'error.html'));
      return;
    }

    // Start Next.js server
    const nextSuccess = await startNextServer();
    if (nextSuccess) {
      mainWindow.loadURL('http://localhost:3335');
    } else {
      mainWindow.loadFile(path.join(__dirname, 'error.html'));
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (chromaProcess) {
    console.log('🛑 Stopping Chroma server...');
    chromaProcess.kill();
  }

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
ipcMain.handle('check-chroma-status', async () => {
  return await checkChromaStatus();
});

ipcMain.handle('restart-chroma', async () => {
  if (chromaProcess) {
    chromaProcess.kill();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return await startChromaServer();
});
