/**
 * BrowserShield Windows Installer Build Script
 * 
 * Main build script that orchestrates the entire installer creation process:
 * 1. Clean previous build
 * 2. Download Node.js portable
 * 3. Copy application files
 * 4. Run npm install --production
 * 5. Generate Inno Setup script
 * 6. Create launcher exe
 * 7. Compile installer with Inno Setup
 * 
 * Requirements: 1.1, 2.1, 3.1, 3.2, 3.3
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Import other installer modules
const { downloadNodePortable } = require('./download-node');
const { generateInnoScript } = require('./generate-iss');
const { createLauncher } = require('./create-launcher');

// Load configuration
const config = require('./build-config.json');

// Paths
const ROOT_DIR = path.resolve(__dirname, '../..');
const BUILD_DIR = path.resolve(ROOT_DIR, config.installer.buildDir);
const OUTPUT_DIR = path.resolve(ROOT_DIR, config.installer.outputDir);
const INNO_SCRIPT_PATH = path.join(__dirname, 'BrowserShield.iss');

/**
 * Log a step message with formatting
 * @param {number} step - Step number
 * @param {string} message - Step description
 */
function logStep(step, message) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Step ${step}: ${message}`);
  console.log(`${'='.repeat(60)}\n`);
}

/**
 * Log success message
 * @param {string} message - Success message
 */
function logSuccess(message) {
  console.log(`✅ ${message}`);
}

/**
 * Log error message
 * @param {string} message - Error message
 */
function logError(message) {
  console.error(`❌ ${message}`);
}

/**
 * Log info message
 * @param {string} message - Info message
 */
function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

/**
 * Step 1: Clean previous build directories
 * @returns {Promise<void>}
 */
async function cleanPreviousBuild() {
  logStep(1, 'Cleaning previous build');

  const dirsToClean = [BUILD_DIR, OUTPUT_DIR];

  for (const dir of dirsToClean) {
    if (fs.existsSync(dir)) {
      logInfo(`Removing ${dir}`);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  // Create fresh directories
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  logSuccess('Previous build cleaned');
}

/**
 * Step 2: Download Node.js portable
 * @returns {Promise<void>}
 */
async function downloadNode() {
  logStep(2, 'Downloading Node.js portable');

  const result = await downloadNodePortable({
    version: config.node.version,
    arch: config.node.arch,
    destDir: BUILD_DIR
  });

  if (!result.success) {
    throw new Error(`Failed to download Node.js: ${result.errors.join(', ')}`);
  }

  logSuccess(`Node.js v${config.node.version} downloaded to ${result.nodePath}`);
}

/**
 * Step 3: Copy application files
 * @returns {Promise<void>}
 */
async function copyApplicationFiles() {
  logStep(3, 'Copying application files');

  const includePatterns = config.files.include;
  const excludePatterns = config.files.exclude;

  // Copy each included file/pattern
  for (const pattern of includePatterns) {
    const sourcePath = path.join(ROOT_DIR, pattern.replace('/**', ''));
    const destPath = path.join(BUILD_DIR, pattern.replace('/**', ''));

    if (pattern.includes('**')) {
      // Directory pattern - copy recursively
      const dirName = pattern.replace('/**', '');
      const sourceDir = path.join(ROOT_DIR, dirName);
      const destDir = path.join(BUILD_DIR, dirName);

      if (fs.existsSync(sourceDir)) {
        copyDirRecursive(sourceDir, destDir, excludePatterns);
        logInfo(`Copied directory: ${dirName}`);
      }
    } else {
      // Single file
      if (fs.existsSync(sourcePath)) {
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(sourcePath, destPath);
        logInfo(`Copied file: ${pattern}`);
      }
    }
  }

  logSuccess('Application files copied');
}

/**
 * Recursively copy directory with exclusion support
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 * @param {string[]} excludePatterns - Patterns to exclude
 */
function copyDirRecursive(src, dest, excludePatterns = []) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    const relativePath = path.relative(ROOT_DIR, srcPath);

    // Check if should be excluded
    if (shouldExclude(relativePath, excludePatterns)) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, excludePatterns);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Check if a path should be excluded based on patterns
 * @param {string} relativePath - Relative path to check
 * @param {string[]} patterns - Exclusion patterns
 * @returns {boolean}
 */
function shouldExclude(relativePath, patterns) {
  const normalizedPath = relativePath.replace(/\\/g, '/');

  for (const pattern of patterns) {
    const normalizedPattern = pattern.replace(/\\/g, '/');

    // Handle glob patterns
    if (normalizedPattern.includes('**')) {
      const prefix = normalizedPattern.replace('/**', '');
      if (normalizedPath.startsWith(prefix)) {
        return true;
      }
    } else if (normalizedPattern.startsWith('*.')) {
      // Extension pattern
      const ext = normalizedPattern.slice(1);
      if (normalizedPath.endsWith(ext)) {
        return true;
      }
    } else if (normalizedPath === normalizedPattern || normalizedPath.startsWith(normalizedPattern + '/')) {
      return true;
    }
  }

  return false;
}

/**
 * Step 4: Run npm install --production
 * @returns {Promise<void>}
 */
async function installDependencies() {
  logStep(4, 'Installing production dependencies');

  // Copy package.json and package-lock.json to build dir
  const packageJsonSrc = path.join(ROOT_DIR, 'package.json');
  const packageLockSrc = path.join(ROOT_DIR, 'package-lock.json');

  // Use the embedded Node.js and npm for installation
  const nodeExe = path.join(BUILD_DIR, 'node.exe');
  const npmCmd = path.join(BUILD_DIR, 'npm.cmd');

  // Check if npm is available
  if (!fs.existsSync(npmCmd)) {
    logInfo('npm.cmd not found in build dir, using system npm');
    // Fall back to system npm
    try {
      execSync('npm install --production --no-optional', {
        cwd: BUILD_DIR,
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
    } catch (error) {
      throw new Error(`npm install failed: ${error.message}`);
    }
  } else {
    // Use embedded npm
    try {
      execSync(`"${npmCmd}" install --production --no-optional`, {
        cwd: BUILD_DIR,
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
    } catch (error) {
      throw new Error(`npm install failed: ${error.message}`);
    }
  }

  // Verify better-sqlite3 native module exists
  const betterSqlitePath = path.join(BUILD_DIR, 'node_modules', 'better-sqlite3');
  if (fs.existsSync(betterSqlitePath)) {
    const bindingPath = findNativeBinding(betterSqlitePath);
    if (bindingPath) {
      logSuccess(`Native module found: ${path.relative(BUILD_DIR, bindingPath)}`);
    } else {
      logInfo('Warning: better-sqlite3 native binding not found, may need rebuild');
    }
  }

  logSuccess('Dependencies installed');
}

/**
 * Find native binding file in a module directory
 * @param {string} moduleDir - Module directory
 * @returns {string|null} - Path to binding file or null
 */
function findNativeBinding(moduleDir) {
  const possiblePaths = [
    path.join(moduleDir, 'build', 'Release', 'better_sqlite3.node'),
    path.join(moduleDir, 'prebuilds', 'win32-x64', 'node.napi.node'),
    path.join(moduleDir, 'prebuilds', 'win32-x64', 'better_sqlite3.node')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Search recursively for .node files
  return findFileRecursive(moduleDir, '.node');
}

/**
 * Find a file with specific extension recursively
 * @param {string} dir - Directory to search
 * @param {string} ext - File extension
 * @returns {string|null}
 */
function findFileRecursive(dir, ext) {
  if (!fs.existsSync(dir)) return null;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const found = findFileRecursive(fullPath, ext);
      if (found) return found;
    } else if (entry.name.endsWith(ext)) {
      return fullPath;
    }
  }

  return null;
}

/**
 * Step 5: Generate Inno Setup script
 * @returns {Promise<void>}
 */
async function generateInnoSetupScript() {
  logStep(5, 'Generating Inno Setup script');

  const result = generateInnoScript({
    outputPath: INNO_SCRIPT_PATH
  });

  logSuccess(`Inno Setup script generated: ${result.outputPath}`);
  logInfo(`App GUID: ${result.appGuid}`);
}

/**
 * Step 6: Create launcher executable
 * @returns {Promise<void>}
 */
async function createLauncherExe() {
  logStep(6, 'Creating launcher executable');

  const result = await createLauncher({
    buildDir: BUILD_DIR,
    sourceDir: ROOT_DIR
  });

  if (result.success) {
    logSuccess('Launcher files created');
  } else {
    throw new Error('Failed to create launcher');
  }
}

/**
 * Step 7: Compile installer with Inno Setup
 * @returns {Promise<string>} - Path to compiled installer
 */
async function compileInstaller() {
  logStep(7, 'Compiling installer with Inno Setup');

  // Find Inno Setup compiler
  const innoCompilerPaths = [
    'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe',
    'C:\\Program Files\\Inno Setup 6\\ISCC.exe',
    'C:\\Program Files (x86)\\Inno Setup 5\\ISCC.exe',
    'C:\\Program Files\\Inno Setup 5\\ISCC.exe'
  ];

  let isccPath = null;
  for (const p of innoCompilerPaths) {
    if (fs.existsSync(p)) {
      isccPath = p;
      break;
    }
  }

  // Also check PATH
  if (!isccPath) {
    try {
      execSync('where ISCC.exe', { stdio: 'ignore' });
      isccPath = 'ISCC.exe';
    } catch {
      // Not in PATH
    }
  }

  if (!isccPath) {
    throw new Error(
      'Inno Setup compiler (ISCC.exe) not found!\n' +
      'Please install Inno Setup from: https://jrsoftware.org/isinfo.php\n' +
      'Or add ISCC.exe to your PATH.'
    );
  }

  logInfo(`Using Inno Setup compiler: ${isccPath}`);

  // Compile the installer
  try {
    execSync(`"${isccPath}" "${INNO_SCRIPT_PATH}"`, {
      stdio: 'inherit',
      cwd: __dirname
    });
  } catch (error) {
    throw new Error(`Inno Setup compilation failed: ${error.message}`);
  }

  // Find the output file
  const expectedOutput = path.join(
    OUTPUT_DIR,
    `BrowserShield-Setup-${config.app.version}.exe`
  );

  if (!fs.existsSync(expectedOutput)) {
    throw new Error(`Expected installer not found: ${expectedOutput}`);
  }

  const stats = fs.statSync(expectedOutput);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  logSuccess(`Installer created: ${expectedOutput}`);
  logInfo(`Size: ${sizeMB} MB`);

  // Verify size is under 200MB (Requirement 1.1)
  if (stats.size > 200 * 1024 * 1024) {
    logError(`Warning: Installer size (${sizeMB} MB) exceeds 200MB limit!`);
  }

  return expectedOutput;
}

/**
 * Main build function
 * @returns {Promise<{success: boolean, installerPath: string, errors: string[]}>}
 */
async function buildInstaller() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       BrowserShield Windows Installer Build Script         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nVersion: ${config.app.version}`);
  console.log(`Node.js: ${config.node.version}`);
  console.log(`Build Dir: ${BUILD_DIR}`);
  console.log(`Output Dir: ${OUTPUT_DIR}`);

  const result = {
    success: false,
    installerPath: '',
    errors: []
  };

  const startTime = Date.now();

  try {
    // Step 1: Clean previous build
    await cleanPreviousBuild();

    // Step 2: Download Node.js portable
    await downloadNode();

    // Step 3: Copy application files
    await copyApplicationFiles();

    // Step 4: Install dependencies
    await installDependencies();

    // Step 5: Generate Inno Setup script
    await generateInnoSetupScript();

    // Step 6: Create launcher
    await createLauncherExe();

    // Step 7: Compile installer
    result.installerPath = await compileInstaller();
    result.success = true;

  } catch (error) {
    logError(error.message);
    result.errors.push(error.message);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n');
  console.log('═'.repeat(60));

  if (result.success) {
    console.log('  ✅ BUILD SUCCESSFUL');
    console.log(`  Installer: ${result.installerPath}`);
  } else {
    console.log('  ❌ BUILD FAILED');
    console.log(`  Errors: ${result.errors.join(', ')}`);
  }

  console.log(`  Time: ${elapsed}s`);
  console.log('═'.repeat(60));
  console.log('\n');

  return result;
}

// Export for use as module
module.exports = {
  buildInstaller,
  cleanPreviousBuild,
  downloadNode,
  copyApplicationFiles,
  installDependencies,
  generateInnoSetupScript,
  createLauncherExe,
  compileInstaller,
  copyDirRecursive,
  shouldExclude,
  BUILD_DIR,
  OUTPUT_DIR,
  ROOT_DIR
};

// Run if called directly
if (require.main === module) {
  buildInstaller()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
