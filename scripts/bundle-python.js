#!/usr/bin/env node

/**
 * Bundle Python + ChromaDB for Windows deployment
 *
 * This script downloads the Python embeddable package and installs ChromaDB
 * so users don't need to install Python separately.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_VERSION = '3.11.9';
const PYTHON_URL = `https://www.python.org/ftp/python/${PYTHON_VERSION}/python-${PYTHON_VERSION}-embed-amd64.zip`;
const RESOURCES_DIR = path.join(__dirname, '..', 'resources');
const PYTHON_DIR = path.join(RESOURCES_DIR, 'python');

console.log('🐍 Bundling Python + ChromaDB for Windows...\n');

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    console.log(`📥 Downloading: ${url}`);

    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (response) => {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`✅ Downloaded: ${dest}`);
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(dest, () => reject(err));
        });
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✅ Downloaded: ${dest}`);
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function extractZip(zipPath, destDir) {
  console.log(`📦 Extracting: ${zipPath} to ${destDir}`);

  // Use Node.js built-in if available, otherwise use system unzip
  try {
    // Try using unzip command (available on most systems)
    await execAsync(`unzip -q "${zipPath}" -d "${destDir}"`);
    console.log(`✅ Extracted to: ${destDir}`);
  } catch (error) {
    // Fallback: try using 7z or inform user
    console.error('❌ Failed to extract. Please install unzip or manually extract the Python zip.');
    throw error;
  }
}

async function installChromaDB() {
  console.log('📦 Installing ChromaDB in bundled Python...');

  // Get pip from Python embeddable package
  const getPipUrl = 'https://bootstrap.pypa.io/get-pip.py';
  const getPipPath = path.join(PYTHON_DIR, 'get-pip.py');

  // Download get-pip.py
  await download(getPipUrl, getPipPath);

  // Enable site-packages by modifying python*._pth file
  const pthFile = fs.readdirSync(PYTHON_DIR).find(f => f.endsWith('._pth'));
  if (pthFile) {
    const pthPath = path.join(PYTHON_DIR, pthFile);
    let content = fs.readFileSync(pthPath, 'utf8');

    // Uncomment or add "import site"
    if (content.includes('#import site')) {
      content = content.replace('#import site', 'import site');
    } else if (!content.includes('import site')) {
      content += '\nimport site\n';
    }

    fs.writeFileSync(pthPath, content);
    console.log(`✅ Enabled site-packages in ${pthFile}`);
  }

  // Install pip
  const pythonExe = path.join(PYTHON_DIR, 'python.exe');
  console.log('Installing pip...');
  await execAsync(`"${pythonExe}" "${getPipPath}"`);
  console.log('✅ pip installed');

  // Install ChromaDB
  console.log('Installing ChromaDB (this may take a few minutes)...');
  const pipExe = path.join(PYTHON_DIR, 'Scripts', 'pip.exe');
  await execAsync(`"${pipExe}" install chromadb --no-warn-script-location`);
  console.log('✅ ChromaDB installed');

  // Clean up
  fs.unlinkSync(getPipPath);
}

async function main() {
  try {
    // Create directories
    if (!fs.existsSync(RESOURCES_DIR)) {
      fs.mkdirSync(RESOURCES_DIR, { recursive: true });
    }

    if (fs.existsSync(PYTHON_DIR)) {
      console.log('⚠️  Python directory already exists. Skipping download.');
      console.log('   Delete resources/python to re-download.');
      return;
    }

    fs.mkdirSync(PYTHON_DIR, { recursive: true });

    // Download Python embeddable package
    const zipPath = path.join(RESOURCES_DIR, 'python-embed.zip');

    if (!fs.existsSync(zipPath)) {
      await download(PYTHON_URL, zipPath);
    } else {
      console.log('⚠️  Python zip already downloaded. Skipping download.');
    }

    // Extract Python
    await extractZip(zipPath, PYTHON_DIR);

    // Install ChromaDB
    await installChromaDB();

    // Clean up zip
    fs.unlinkSync(zipPath);

    console.log('\n✅ Python + ChromaDB bundled successfully!');
    console.log(`📁 Location: ${PYTHON_DIR}`);
    console.log('🚀 You can now build the Electron app with bundled Python.\n');

  } catch (error) {
    console.error('\n❌ Error bundling Python:', error);
    process.exit(1);
  }
}

main();
