import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let nextProcess = null;

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
function createWindow() {
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

  // Start Next.js server (which includes ChromaDB as embedded library)
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

ipcMain.handle('restart-server', async () => {
  if (nextProcess) {
    nextProcess.kill();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return await startNextServer();
});
