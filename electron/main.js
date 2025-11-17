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

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🔍 STARTUP VALIDATION - COMPREHENSIVE LOGGING               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    // Determine base path based on whether app is packaged
    const basePath = app.isPackaged
      ? path.join(process.resourcesPath, 'app')
      : app.getAppPath();

    console.log('📍 Environment Information:');
    console.log(`   • Platform: ${process.platform}`);
    console.log(`   • Architecture: ${process.arch}`);
    console.log(`   • Node version: ${process.version}`);
    console.log(`   • Electron version: ${process.versions.electron}`);
    console.log(`   • Is packaged: ${app.isPackaged}`);
    console.log(`   • App path: ${app.getAppPath()}`);
    console.log(`   • Resources path: ${app.isPackaged ? process.resourcesPath : 'N/A (dev mode)'}`);
    console.log(`   • Current working dir: ${process.cwd()}`);
    console.log(`   • Base path: ${basePath}`);
    console.log('');

    // Check data directory exists
    console.log('📦 STEP 1: Validating data directory...');
    const dataDir = path.join(basePath, 'data');
    console.log(`   Looking for: ${dataDir}`);

    if (!fs.existsSync(dataDir)) {
      console.error('   ❌ Data directory NOT FOUND');
      issues.push({
        severity: 'critical',
        message: 'Data directory is missing',
        path: dataDir,
        fix: 'Reinstall the application. The data directory was not bundled correctly.'
      });
    } else {
      console.log('   ✅ Data directory exists');

      // List all files in data directory
      const allFiles = fs.readdirSync(dataDir);
      console.log(`   Found ${allFiles.length} files in data directory:`);
      for (const file of allFiles) {
        const filePath = path.join(dataDir, file);
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`     • ${file}: ${sizeMB} MB`);
      }

      // Check individual embedding files
      console.log('\n   🔍 Checking required embedding files:');
      const requiredDataFiles = [
        'insights_embedded_1024.json',
        'curriculum_embedded_1024.json',
        'metadata_embedded_1024.json'
      ];

      for (const file of requiredDataFiles) {
        const filePath = path.join(dataDir, file);
        if (!fs.existsSync(filePath)) {
          console.error(`   ❌ Missing: ${file}`);
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
            console.error(`   ❌ Too small (corrupted?): ${file} (${stats.size} bytes)`);
            issues.push({
              severity: 'critical',
              message: `Embedding file is too small (corrupted?): ${file}`,
              path: filePath,
              fix: 'File may be corrupted. Reinstall the application.'
            });
          } else {
            console.log(`   ✅ ${file}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
          }
        }
      }
    }
    console.log('');

    // Check models directory
    console.log('📦 STEP 2: Validating models directory...');
    const modelsRootDir = path.join(basePath, 'models');
    const modelsDir = path.join(basePath, 'models', 'transformers');
    console.log(`   Looking for: ${modelsDir}`);

    // First check if models root exists
    if (!fs.existsSync(modelsRootDir)) {
      console.error('   ❌ Models root directory NOT FOUND');
      issues.push({
        severity: 'critical',
        message: 'Models directory is missing entirely',
        path: modelsRootDir,
        fix: 'Reinstall the application or run: npm run download-transformers-model'
      });
    } else {
      console.log('   ✅ Models root directory exists');

      // List what's in models directory
      const modelsRootContents = fs.readdirSync(modelsRootDir);
      console.log(`   Found ${modelsRootContents.length} items in models/:`);
      for (const item of modelsRootContents) {
        const itemPath = path.join(modelsRootDir, item);
        const isDir = fs.statSync(itemPath).isDirectory();
        console.log(`     ${isDir ? '📁' : '📄'} ${item}`);
      }

      // Check transformers subdirectory
      if (!fs.existsSync(modelsDir)) {
        console.error('\n   ❌ models/transformers/ subdirectory NOT FOUND');
        issues.push({
          severity: 'critical',
          message: 'Transformers.js models directory is missing',
          path: modelsDir,
          fix: 'Reinstall the application or run: npm run download-transformers-model'
        });
      } else {
        console.log('\n   ✅ models/transformers/ subdirectory exists');

        // List transformers directory contents
        const transformersContents = fs.readdirSync(modelsDir);
        console.log(`   Found ${transformersContents.length} items in models/transformers/:`);

        // Calculate total size
        const getDirectorySize = (dirPath) => {
          let size = 0;
          try {
            const items = fs.readdirSync(dirPath);
            for (const item of items) {
              const itemPath = path.join(dirPath, item);
              const stats = fs.statSync(itemPath);
              if (stats.isDirectory()) {
                size += getDirectorySize(itemPath);
              } else {
                size += stats.size;
              }
            }
          } catch (err) {
            console.error(`     Error reading ${dirPath}: ${err.message}`);
          }
          return size;
        };

        for (const item of transformersContents) {
          const itemPath = path.join(modelsDir, item);
          const isDir = fs.statSync(itemPath).isDirectory();
          if (isDir) {
            const size = getDirectorySize(itemPath);
            const sizeMB = (size / 1024 / 1024).toFixed(2);
            console.log(`     📁 ${item}/ (${sizeMB} MB)`);
          } else {
            const stats = fs.statSync(itemPath);
            const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
            console.log(`     📄 ${item} (${sizeMB} MB)`);
          }
        }

        const totalSize = getDirectorySize(modelsDir);
        const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
        console.log(`\n   📊 Total models size: ${totalSizeMB} MB`);

        // Check for BGE model specifically
        console.log('\n   🔍 Looking for BGE model:');
        const modelPath = path.join(modelsDir, 'models--Xenova--bge-large-en-v1.5');
        console.log(`   Expected path: ${modelPath}`);

        if (!fs.existsSync(modelPath)) {
          console.error('   ❌ BGE model directory NOT FOUND');

          // Check for alternative structures
          const possibleModels = transformersContents.filter(item =>
            item.includes('bge') || item.includes('Xenova') || item.startsWith('models--')
          );

          if (possibleModels.length > 0) {
            console.log('   ⚠️  Found alternative model structures:');
            for (const model of possibleModels) {
              console.log(`     • ${model}`);
            }
          }

          // Only add as critical issue if total size is small
          if (totalSize < 100 * 1024 * 1024) {  // Less than 100MB
            console.error(`   ⚠️  CRITICAL: Total size (${totalSizeMB} MB) < expected (300-500 MB)`);
            issues.push({
              severity: 'critical',
              message: 'BGE-large-en-v1.5 model is missing or incomplete',
              path: modelPath,
              fix: 'Model not found. Run: npm run download-transformers-model'
            });
          } else {
            console.log('   ⚠️  Model structure differs from expected, but size looks OK');
          }
        } else {
          console.log('   ✅ BGE model directory found');

          // List model files
          const modelFiles = fs.readdirSync(modelPath);
          console.log(`   Model contains ${modelFiles.length} items`);

          // Check for key files
          const keyFiles = ['onnx', 'tokenizer.json', 'config.json'];
          for (const key of keyFiles) {
            const found = modelFiles.some(f => f.includes(key));
            console.log(`     ${found ? '✅' : '❌'} ${key}: ${found ? 'Found' : 'Missing'}`);
          }
        }
      }
    }
    console.log('');

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
    console.log('💾 STEP 3: Checking system resources...');
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();
    const totalGB = (totalMem / 1024 / 1024 / 1024).toFixed(2);
    const freeGB = (freeMem / 1024 / 1024 / 1024).toFixed(2);

    console.log(`   • Total memory: ${totalGB} GB`);
    console.log(`   • Free memory: ${freeGB} GB`);

    if (freeMem < 1 * 1024 * 1024 * 1024) { // Less than 1GB free
      console.warn(`   ⚠️  Low memory warning: ${freeGB} GB free`);
      issues.push({
        severity: 'warning',
        message: `Low system memory: ${freeGB}GB free`,
        fix: 'Close other applications to free up memory'
      });
    } else {
      console.log('   ✅ Sufficient memory available');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Validation error:', error);
    issues.push({
      severity: 'critical',
      message: `Validation failed: ${error.message}`,
      fix: 'Contact support with this error message'
    });
  }

  // Summary
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  📊 VALIDATION SUMMARY                                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  if (issues.length === 0) {
    console.log('\n✅ All validation checks passed! App ready to start.\n');
  } else {
    console.log(`\nFound ${criticalCount} critical issue(s) and ${warningCount} warning(s)\n`);

    if (criticalCount > 0) {
      console.error('🔴 CRITICAL ISSUES:');
      issues.filter(i => i.severity === 'critical').forEach((issue, idx) => {
        console.error(`  ${idx + 1}. ${issue.message}`);
        console.error(`     Path: ${issue.path || 'N/A'}`);
        console.error(`     Fix: ${issue.fix}`);
      });
      console.log('');
    }

    if (warningCount > 0) {
      console.warn('⚠️  WARNINGS:');
      issues.filter(i => i.severity === 'warning').forEach((issue, idx) => {
        console.warn(`  ${idx + 1}. ${issue.message}`);
        console.warn(`     Fix: ${issue.fix}`);
      });
      console.log('');
    }
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
