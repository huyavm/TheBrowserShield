/**
 * Download Node.js Portable for Windows
 * Downloads and extracts Node.js portable from nodejs.org
 * 
 * Requirements: 2.1, 2.2
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const config = require('./build-config.json');

const NODE_VERSION = config.node.version;
const NODE_ARCH = config.node.arch;
const BUILD_DIR = path.resolve(__dirname, '../../dist/build');

/**
 * Get the download URL for Node.js portable
 * @param {string} version - Node.js version
 * @param {string} arch - Architecture (x64 or x86)
 * @returns {string} Download URL
 */
function getNodeDownloadUrl(version, arch) {
  return `https://nodejs.org/dist/v${version}/node-v${version}-win-${arch}.zip`;
}

/**
 * Get the SHASUMS URL for verification
 * @param {string} version - Node.js version
 * @returns {string} SHASUMS URL
 */
function getShaSumsUrl(version) {
  return `https://nodejs.org/dist/v${version}/SHASUMS256.txt`;
}

/**
 * Download a file from URL with retry support
 * @param {string} url - URL to download
 * @param {string} destPath - Destination file path
 * @param {number} retries - Number of retries
 * @returns {Promise<void>}
 */
async function downloadFile(url, destPath, retries = 3) {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Downloading ${url} (attempt ${attempt}/${retries})...`);
      await downloadWithRedirect(url, destPath);
      console.log(`Downloaded to ${destPath}`);
      return;
    } catch (error) {
      console.error(`Download failed: ${error.message}`);
      if (attempt === retries) {
        throw new Error(`Failed to download after ${retries} attempts: ${error.message}`);
      }
      console.log('Retrying...');
      await sleep(2000);
    }
  }
}


/**
 * Download with redirect support
 * @param {string} url - URL to download
 * @param {string} destPath - Destination file path
 * @returns {Promise<void>}
 */
function downloadWithRedirect(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    
    const request = https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        downloadWithRedirect(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      let lastProgress = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const progress = Math.floor((downloadedSize / totalSize) * 100);
        if (progress >= lastProgress + 10) {
          console.log(`Progress: ${progress}%`);
          lastProgress = progress;
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      reject(err);
    });

    file.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      reject(err);
    });
  });
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch text content from URL
 * @param {string} url - URL to fetch
 * @returns {Promise<string>}
 */
function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        fetchText(response.headers.location).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
    }).on('error', reject);
  });
}


/**
 * Calculate SHA256 checksum of a file
 * @param {string} filePath - Path to file
 * @returns {Promise<string>} Hex checksum
 */
function calculateChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Verify file checksum against SHASUMS
 * @param {string} filePath - Path to downloaded file
 * @param {string} version - Node.js version
 * @param {string} arch - Architecture
 * @returns {Promise<boolean>}
 */
async function verifyChecksum(filePath, version, arch) {
  console.log('Verifying checksum...');
  
  const shaSumsUrl = getShaSumsUrl(version);
  const shaSumsContent = await fetchText(shaSumsUrl);
  
  const fileName = `node-v${version}-win-${arch}.zip`;
  const lines = shaSumsContent.split('\n');
  
  let expectedChecksum = null;
  for (const line of lines) {
    if (line.includes(fileName)) {
      expectedChecksum = line.split(/\s+/)[0].toLowerCase();
      break;
    }
  }

  if (!expectedChecksum) {
    throw new Error(`Checksum not found for ${fileName}`);
  }

  const actualChecksum = await calculateChecksum(filePath);
  
  if (actualChecksum.toLowerCase() !== expectedChecksum) {
    throw new Error(`Checksum mismatch! Expected: ${expectedChecksum}, Got: ${actualChecksum}`);
  }

  console.log('Checksum verified successfully!');
  return true;
}

/**
 * Extract ZIP file using PowerShell
 * @param {string} zipPath - Path to ZIP file
 * @param {string} destDir - Destination directory
 * @returns {Promise<void>}
 */
async function extractZip(zipPath, destDir) {
  console.log(`Extracting ${zipPath} to ${destDir}...`);
  
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Use PowerShell to extract ZIP
  const psCommand = `Expand-Archive -Path "${zipPath}" -DestinationPath "${destDir}" -Force`;
  
  try {
    execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' });
    console.log('Extraction complete!');
  } catch (error) {
    throw new Error(`Failed to extract ZIP: ${error.message}`);
  }
}


/**
 * Move Node.js files to build directory root
 * @param {string} extractDir - Directory where ZIP was extracted
 * @param {string} version - Node.js version
 * @param {string} arch - Architecture
 * @param {string} destDir - Final destination directory
 */
function moveNodeFiles(extractDir, version, arch, destDir) {
  const nodeFolder = path.join(extractDir, `node-v${version}-win-${arch}`);
  
  if (!fs.existsSync(nodeFolder)) {
    throw new Error(`Node.js folder not found: ${nodeFolder}`);
  }

  // Copy node.exe to destination
  const nodeExeSrc = path.join(nodeFolder, 'node.exe');
  const nodeExeDest = path.join(destDir, 'node.exe');
  
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.copyFileSync(nodeExeSrc, nodeExeDest);
  console.log(`Copied node.exe to ${nodeExeDest}`);

  // Copy npm and npx if needed for npm install during build
  const npmDir = path.join(nodeFolder, 'node_modules', 'npm');
  if (fs.existsSync(npmDir)) {
    const destNpmDir = path.join(destDir, 'node_modules', 'npm');
    copyDirRecursive(npmDir, destNpmDir);
    console.log('Copied npm module');
  }

  // Copy npm.cmd and npx.cmd
  const npmCmd = path.join(nodeFolder, 'npm.cmd');
  const npxCmd = path.join(nodeFolder, 'npx.cmd');
  
  if (fs.existsSync(npmCmd)) {
    fs.copyFileSync(npmCmd, path.join(destDir, 'npm.cmd'));
  }
  if (fs.existsSync(npxCmd)) {
    fs.copyFileSync(npxCmd, path.join(destDir, 'npx.cmd'));
  }
}

/**
 * Recursively copy directory
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Clean up temporary files
 * @param {string[]} files - Files to delete
 */
function cleanup(files) {
  for (const file of files) {
    if (fs.existsSync(file)) {
      if (fs.statSync(file).isDirectory()) {
        fs.rmSync(file, { recursive: true, force: true });
      } else {
        fs.unlinkSync(file);
      }
      console.log(`Cleaned up: ${file}`);
    }
  }
}


/**
 * Main function to download and setup Node.js portable
 * @param {Object} options - Options
 * @param {string} options.version - Node.js version (default from config)
 * @param {string} options.arch - Architecture (default from config)
 * @param {string} options.destDir - Destination directory (default BUILD_DIR)
 * @returns {Promise<{success: boolean, nodePath: string, errors: string[]}>}
 */
async function downloadNodePortable(options = {}) {
  const version = options.version || NODE_VERSION;
  const arch = options.arch || NODE_ARCH;
  const destDir = options.destDir || BUILD_DIR;

  const result = {
    success: false,
    nodePath: '',
    errors: []
  };

  const tempDir = path.join(destDir, 'temp');
  const zipPath = path.join(tempDir, `node-v${version}-win-${arch}.zip`);

  try {
    console.log(`\n=== Downloading Node.js v${version} (${arch}) ===\n`);

    // Step 1: Download Node.js ZIP
    const downloadUrl = getNodeDownloadUrl(version, arch);
    await downloadFile(downloadUrl, zipPath);

    // Step 2: Verify checksum
    await verifyChecksum(zipPath, version, arch);

    // Step 3: Extract ZIP
    await extractZip(zipPath, tempDir);

    // Step 4: Move files to destination
    moveNodeFiles(tempDir, version, arch, destDir);

    // Step 5: Cleanup
    cleanup([zipPath, path.join(tempDir, `node-v${version}-win-${arch}`)]);

    // Remove temp dir if empty
    if (fs.existsSync(tempDir) && fs.readdirSync(tempDir).length === 0) {
      fs.rmdirSync(tempDir);
    }

    result.success = true;
    result.nodePath = path.join(destDir, 'node.exe');
    
    console.log(`\n=== Node.js v${version} downloaded successfully! ===`);
    console.log(`Node.exe location: ${result.nodePath}\n`);

  } catch (error) {
    result.errors.push(error.message);
    console.error(`\nError: ${error.message}\n`);
    
    // Cleanup on error
    cleanup([zipPath, tempDir]);
  }

  return result;
}

// Export for use as module
module.exports = {
  downloadNodePortable,
  getNodeDownloadUrl,
  getShaSumsUrl,
  verifyChecksum,
  calculateChecksum,
  extractZip,
  copyDirRecursive,
  NODE_VERSION,
  NODE_ARCH,
  BUILD_DIR
};

// Run if called directly
if (require.main === module) {
  downloadNodePortable()
    .then(result => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
