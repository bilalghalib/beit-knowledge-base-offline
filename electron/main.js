import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn, fork } from 'child_process';
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

// Comprehensive startup validation
async function checkDependencies() {
  const issues = [];

  try {
    // Determine base path based on whether app is packaged
    const basePath = app.isPackaged
      ? path.join(process.resourcesPath, 'app')
      : app.getAppPath();

    console.log('🔍 Validating installation from:', basePath);

    // Check data directory exists
    const dataDir = path.join(basePath, 'data');
    if (!fs.existsSync(dataDir)) {
      issues.push({
        severity: 'critical',
        message: 'Data directory is missing',
        path: dataDir,
        fix: 'Reinstall the application. The data directory was not bundled correctly.'
      });
    } else {
      // Check individual embedding files
      const requiredDataFiles = [
        'insights_embedded_1024.json',
        'curriculum_embedded_1024.json',
        'metadata_embedded_1024.json'
      ];

      for (const file of requiredDataFiles) {
        const filePath = path.join(dataDir, file);
        if (!fs.existsSync(filePath)) {
          issues.push({
            severity: 'critical',
            message: `Missing required embedding file: ${file}`,
            path: filePath,
            fix: 'Reinstall the application or run: npm run precompute-embeddings'
          });
        } else {
          // Check file size (should be > 100KB)
          const stats = fs.statSync(filePath);
          if (stats.size < 100000) {
            issues.push({
              severity: 'critical',
              message: `Embedding file is too small (corrupted?): ${file}`,
              path: filePath,
              fix: 'File may be corrupted. Reinstall the application.'
            });
          } else {
            console.log(`✅ ${file}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
          }
        }
      }
    }

    // Check models directory
    const modelsDir = path.join(basePath, 'models', 'transformers');
    if (!fs.existsSync(modelsDir)) {
      issues.push({
        severity: 'critical',
        message: 'Transformers.js models directory is missing',
        path: modelsDir,
        fix: 'Reinstall the application or run: npm run download-transformers-model'
      });
    } else {
      // Check for BGE model
      const modelPath = path.join(modelsDir, 'models--Xenova--bge-large-en-v1.5');
      if (!fs.existsSync(modelPath)) {
        issues.push({
          severity: 'critical',
          message: 'BGE-large-en-v1.5 model is missing',
          path: modelPath,
          fix: 'Model not found. Run: npm run download-transformers-model'
        });
      } else {
        console.log('✅ BGE model found');
      }
    }

    // Check .next/standalone directory in packaged app
    if (app.isPackaged) {
      const standalonePath = path.join(process.resourcesPath, 'app', '.next', 'standalone');
      if (!fs.existsSync(standalonePath)) {
        issues.push({
          severity: 'critical',
          message: 'Next.js standalone build is missing',
          path: standalonePath,
          fix: 'Application was not built correctly. Rebuild with: npm run build'
        });
      } else {
        console.log('✅ Standalone build found');
      }
    }

    // Memory check (warn if low)
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();
    const totalGB = (totalMem / 1024 / 1024 / 1024).toFixed(2);
    const freeGB = (freeMem / 1024 / 1024 / 1024).toFixed(2);

    console.log(`💾 System memory: ${freeGB}GB free / ${totalGB}GB total`);

    if (freeMem < 1 * 1024 * 1024 * 1024) { // Less than 1GB free
      issues.push({
        severity: 'warning',
        message: `Low system memory: ${freeGB}GB free`,
        fix: 'Close other applications to free up memory'
      });
    }

  } catch (error) {
    issues.push({
      severity: 'critical',
      message: `Validation failed: ${error.message}`,
      fix: 'Contact support with this error message'
    });
  }

  return issues;
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

      // Use fork() which properly uses Electron's Node.js on all platforms
      // fork() automatically handles Windows vs Mac differences
      nextProcess = fork(serverPath, [], {
        cwd: standalonePath,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
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
      devTools: true, // Always enable DevTools for debugging
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

  // Run comprehensive dependency checks
  const finalIssues = await checkDependencies();

  // Separate critical from warning issues
  const criticalIssues = finalIssues.filter(i => i.severity === 'critical');
  const warningIssues = finalIssues.filter(i => i.severity === 'warning');

  if (criticalIssues.length > 0) {
    console.error('🔴 CRITICAL ERRORS DETECTED:');
    criticalIssues.forEach(issue => {
      console.error(`  - ${issue.message}`);
      console.error(`    Path: ${issue.path || 'N/A'}`);
      console.error(`    Fix: ${issue.fix}`);
    });

    // Collect diagnostics
    const diagnostics = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      appPath: app.getAppPath(),
      resourcesPath: app.isPackaged ? process.resourcesPath : 'N/A (dev mode)',
      isPackaged: app.isPackaged,
      cwd: process.cwd(),
      totalMemory: `${(require('os').totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
      freeMemory: `${(require('os').freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`
    };

    // Show error screen with details
    mainWindow.loadFile(path.join(__dirname, 'error.html'));
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('critical-startup-error', {
        issues: criticalIssues,
        diagnostics
      });
    });

    // Don't start the server if there are critical issues
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
    return;
  }

  if (warningIssues.length > 0) {
    console.warn('⚠️  Warning notices:', warningIssues);
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('dependency-issues', warningIssues);
    });
  }

  // Start Next.js server
  const nextSuccess = await startNextServer();
  if (nextSuccess) {
    mainWindow.loadURL('http://localhost:3335');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'error.html'));
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('server-error', 'Next.js server failed to start within timeout period');
    });
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
