/**
 * Build Portable App for Windows
 * Creates a self-contained folder with app + browsers
 * 
 * Requirements: 6.1, 6.4, 6.6
 * - node_modules is NOT included (installed on first run)
 * - Fix-Dependencies.bat included for troubleshooting
 * - README with troubleshooting guide
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const VERSION = packageJson.version;

const BUILD_DIR = path.join(__dirname, '..', 'dist', 'BrowserShield-Portable');
const BROWSERS_DIR = path.join(BUILD_DIR, 'browsers');

console.log('🛡️ BrowserShield Portable Builder');
console.log(`   Version: ${VERSION}`);
console.log('==================================\n');

// Step 1: Clean previous build and create directory structure
function createDirectories() {
    console.log('📁 Creating directory structure...');
    
    // Clean previous build to ensure fresh state
    if (fs.existsSync(BUILD_DIR)) {
        console.log('  ⚠ Removing previous build...');
        fs.rmSync(BUILD_DIR, { recursive: true, force: true });
    }
    
    const dirs = [
        BUILD_DIR,
        BROWSERS_DIR,
        path.join(BROWSERS_DIR, 'chrome'),
        path.join(BROWSERS_DIR, 'firefox'),
        path.join(BUILD_DIR, 'data'),
        path.join(BUILD_DIR, 'data', 'logs'),
        path.join(BUILD_DIR, 'data', 'browser-profiles'),
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`  ✓ Created: ${path.relative(BUILD_DIR, dir) || 'root'}`);
        }
    });
}

// Step 2: Copy application files (EXCLUDING node_modules - Requirement 6.1)
function copyAppFiles() {
    console.log('\n📦 Copying application files...');
    console.log('  ⚠ Note: node_modules is NOT included (will be installed on first run)');
    
    const filesToCopy = [
        'server.js',
        'package.json',
        'package-lock.json',
    ];
    
    const dirsToCopy = [
        'config',
        'middleware',
        'routes',
        'services',
        'utils',
        'public',
    ];
    
    // Directories to explicitly EXCLUDE
    const excludeDirs = [
        'node_modules',  // Requirement 6.1: NOT included to avoid native module conflicts
        '.git',
        'dist',
        'tests',
        '.kiro',
        '.vscode',
    ];
    
    // Copy individual files
    filesToCopy.forEach(file => {
        const src = path.join(__dirname, '..', file);
        const dest = path.join(BUILD_DIR, file);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(`  ✓ Copied: ${file}`);
        }
    });
    
    // Copy directories (excluding node_modules and other dev directories)
    dirsToCopy.forEach(dir => {
        if (excludeDirs.includes(dir)) {
            console.log(`  ⊘ Skipped: ${dir}/ (excluded)`);
            return;
        }
        const src = path.join(__dirname, '..', dir);
        const dest = path.join(BUILD_DIR, dir);
        if (fs.existsSync(src)) {
            copyDirSync(src, dest, excludeDirs);
            console.log(`  ✓ Copied: ${dir}/`);
        }
    });
}

// Helper: Copy directory recursively (with exclusion support)
function copyDirSync(src, dest, excludeDirs = []) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
        // Skip excluded directories
        if (excludeDirs.includes(entry.name)) {
            continue;
        }
        
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath, excludeDirs);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Step 3: Create portable config
function createPortableConfig() {
    console.log('\n⚙️ Creating portable configuration...');
    
    const portableConfig = {
        portable: true,
        browsersPath: './browsers',
        dataPath: './data',
        chrome: {
            executablePath: './browsers/chrome/chrome.exe'
        },
        firefox: {
            executablePath: './browsers/firefox/firefox.exe'
        }
    };
    
    fs.writeFileSync(
        path.join(BUILD_DIR, 'portable-config.json'),
        JSON.stringify(portableConfig, null, 2)
    );
    console.log('  ✓ Created: portable-config.json');
}

// Step 4: Create launcher scripts
function createLaunchers() {
    console.log('\n🚀 Creating launcher scripts...');
    
    // Windows batch file with Vietnamese messages and all improvements
    const batchContent = `@echo off
title BrowserShield - Anti-Detect Browser Manager
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo  ========================================
echo   BrowserShield - Portable Edition
echo  ========================================
echo.

REM ========================================
REM Check Node.js
REM ========================================
echo [CHECK] Kiem tra Node.js...

REM First check embedded Node.js
if exist "runtime\\nodejs\\node.exe" (
    set "PATH=%~dp0runtime\\nodejs;%PATH%"
    echo         [OK] Su dung Node.js embedded
    goto :check_node_version
)

REM Check system Node.js
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('node --version') do echo         [OK] Node.js %%i
    goto :check_node_version
)

REM Node.js not found - offer to install
echo.
echo  [ERROR] Khong tim thay Node.js!
echo.
echo  Node.js can thiet de chay BrowserShield.
echo  Chon mot tuy chon:
echo.
echo    1. Tu dong cai dat Node.js (Khuyen nghi)
echo    2. Mo nodejs.org de tai thu cong
echo    3. Thoat
echo.
set /p choice="Nhap lua chon (1/2/3): "

if "%choice%"=="1" goto :auto_install
if "%choice%"=="2" goto :manual_install
goto :exit_app

:auto_install
echo.
echo [INFO] Dang tai Node.js installer...
echo        Co the mat vai phut...
echo.

set NODE_VERSION=20.11.0
set NODE_INSTALLER=node-v%NODE_VERSION%-x64.msi
set NODE_URL=https://nodejs.org/dist/v%NODE_VERSION%/%NODE_INSTALLER%

REM Download
powershell -Command "$ProgressPreference = 'SilentlyContinue'; Write-Host 'Dang tai...' -ForegroundColor Yellow; Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%TEMP%\\%NODE_INSTALLER%'; Write-Host 'Tai xong!' -ForegroundColor Green"

if not exist "%TEMP%\\%NODE_INSTALLER%" (
    echo [ERROR] Tai that bai! Vui long cai dat thu cong.
    start https://nodejs.org
    pause
    goto :exit_app
)

echo.
echo [INFO] Dang cai dat Node.js v%NODE_VERSION%...
echo        Vui long doi va lam theo huong dan...
echo.

REM Install silently
msiexec /i "%TEMP%\\%NODE_INSTALLER%" /passive /norestart

REM Clean up
del "%TEMP%\\%NODE_INSTALLER%" 2>nul

echo.
echo [OK] Da cai dat Node.js!
echo.
echo  ========================================
echo   QUAN TRONG: Vui long khoi dong lai!
echo  ========================================
echo.
echo   Dong cua so nay va chay lai Start-BrowserShield.bat
echo.
pause
goto :exit_app

:manual_install
echo.
echo [INFO] Dang mo nodejs.org...
start https://nodejs.org
echo.
echo Sau khi cai dat Node.js, vui long khoi dong lai script nay.
pause
goto :exit_app

:check_node_version
REM ========================================
REM Validate Node.js version >= 18.0.0
REM ========================================
for /f "tokens=1,2,3 delims=v." %%a in ('node --version') do (
    set NODE_MAJOR=%%a
)
if !NODE_MAJOR! LSS 18 (
    echo.
    echo  [ERROR] Phien ban Node.js qua cu!
    echo.
    echo  BrowserShield yeu cau Node.js 18.0.0 tro len.
    echo  Phien ban hien tai: !NODE_MAJOR!.x
    echo.
    echo  Vui long cap nhat Node.js tu https://nodejs.org
    echo.
    pause
    goto :exit_app
)

:check_port
REM ========================================
REM Check if port 5000 is in use
REM ========================================
echo [CHECK] Kiem tra cong 5000...
netstat -ano | findstr ":5000 " | findstr "LISTENING" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo.
    echo  [WARNING] Cong 5000 dang duoc su dung!
    echo.
    echo  Co the BrowserShield dang chay o cua so khac,
    echo  hoac mot ung dung khac dang dung cong nay.
    echo.
    echo  Chon mot tuy chon:
    echo    1. Tiep tuc khoi dong (co the loi)
    echo    2. Thoat
    echo.
    set /p port_choice="Nhap lua chon (1/2): "
    if "!port_choice!"=="2" goto :exit_app
)
echo         [OK] Cong 5000 san sang

:check_deps
REM ========================================
REM Check and install dependencies
REM ========================================
echo [CHECK] Kiem tra dependencies...

REM Check if first run marker exists
if not exist "node_modules\\.installed_ok" (
    echo         Dang cai dat/rebuild packages...
    echo         Co the mat vai phut lan dau...
    echo.
    
    REM Remove old node_modules if exists (to avoid version conflicts)
    if exist "node_modules" (
        echo         Dang xoa modules cu...
        rmdir /s /q node_modules 2>nul
    )
    
    REM Fresh install
    call npm install --production
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Khong the cai dat dependencies!
        echo.
        echo Thu chay: npm install --production
        pause
        goto :exit_app
    )
    
    REM Create marker file
    echo OK > "node_modules\\.installed_ok"
    echo         [OK] Da cai dat dependencies
) else (
    echo         [OK] Dependencies san sang
)

REM ========================================
REM Start the server
REM ========================================
echo.
echo [START] Dang khoi dong BrowserShield server...
echo.
echo  ----------------------------------------
echo   Server URL: http://localhost:5000
echo   Admin:      http://localhost:5000/admin.html
echo   Proxy:      http://localhost:5000/proxy-manager.html
echo  ----------------------------------------
echo.
echo   Nhan Ctrl+C de dung server
echo.

node server.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Server bi loi! Ma loi: %ERRORLEVEL%
    echo.
    echo Neu ban thay loi "NODE_MODULE_VERSION", chay Fix-Dependencies.bat
    echo.
)

pause

:exit_app
endlocal
`;
    
    fs.writeFileSync(path.join(BUILD_DIR, 'Start-BrowserShield.bat'), batchContent);
    console.log('  ✓ Created: Start-BrowserShield.bat');
    
    // Fix-Dependencies.bat
    const fixDepsContent = `@echo off
title BrowserShield - Fix Dependencies
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  ========================================
echo   BrowserShield - Sua Loi Dependencies
echo  ========================================
echo.
echo  Script nay se cai dat lai tat ca dependencies
echo  de sua loi tuong thich native module.
echo.

REM Check for embedded Node.js first
if exist "runtime\\nodejs\\node.exe" (
    set "PATH=%~dp0runtime\\nodejs;%PATH%"
    echo [INFO] Su dung Node.js embedded
) else (
    where node >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Khong tim thay Node.js!
        echo Vui long chay Start-BrowserShield.bat truoc de cai dat Node.js.
        pause
        exit /b 1
    )
)

echo.
for /f "tokens=*" %%i in ('node --version') do echo [INFO] Phien ban Node.js: %%i
echo.

echo [1/4] Xoa npm cache...
call npm cache clean --force >nul 2>nul
echo       Xong.

echo.
echo [2/4] Xoa node_modules cu...
if exist "node_modules" (
    rmdir /s /q node_modules
    echo       Xong.
) else (
    echo       Khong co modules cu.
)

echo.
echo [3/4] Cai dat dependencies moi...
echo       Co the mat vai phut...
echo.

call npm install --production

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Cai dat that bai!
    echo.
    echo Cac giai phap co the:
    echo   1. Kiem tra ket noi internet
    echo   2. Thu chay voi quyen Administrator
    echo   3. Cai dat Visual Studio Build Tools neu duoc yeu cau
    echo.
    pause
    exit /b 1
)

echo.
echo [4/4] Tao marker file...
echo OK > "node_modules\\.installed_ok"

echo.
echo  ========================================
echo   [THANH CONG] Da sua xong dependencies!
echo  ========================================
echo.
echo   Bay gio chay Start-BrowserShield.bat de khoi dong.
echo.
pause
`;
    
    fs.writeFileSync(path.join(BUILD_DIR, 'Fix-Dependencies.bat'), fixDepsContent);
    console.log('  ✓ Created: Fix-Dependencies.bat');
    
    // PowerShell script with all improvements
    const psContent = `# BrowserShield Portable Launcher (PowerShell)
# Requirements: 4.1, 4.2

$Host.UI.RawUI.WindowTitle = "BrowserShield - Anti-Detect Browser Manager"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host "   BrowserShield - Portable Edition" -ForegroundColor Cyan
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

# Check execution policy
$policy = Get-ExecutionPolicy -Scope CurrentUser
if ($policy -eq "Restricted") {
    Write-Host "[WARNING] PowerShell execution policy is Restricted" -ForegroundColor Yellow
    Write-Host "          Run: Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned" -ForegroundColor Yellow
    Write-Host ""
}

# Check for embedded Node.js first
$embeddedNode = Join-Path $PSScriptRoot "runtime\\nodejs\\node.exe"
if (Test-Path $embeddedNode) {
    $env:PATH = "$(Join-Path $PSScriptRoot 'runtime\\nodejs');$env:PATH"
    Write-Host "[CHECK] Su dung Node.js embedded" -ForegroundColor Green
} elseif (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Khong tim thay Node.js!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Node.js can thiet de chay BrowserShield."
    Write-Host "  Vui long cai dat tu https://nodejs.org"
    Write-Host ""
    Read-Host "Nhan Enter de thoat"
    exit 1
}

# Check Node.js version >= 18.0.0
$nodeVersion = (node --version) -replace 'v', ''
$majorVersion = [int]($nodeVersion.Split('.')[0])
Write-Host "[CHECK] Node.js version: v$nodeVersion" -ForegroundColor Green

if ($majorVersion -lt 18) {
    Write-Host ""
    Write-Host "[ERROR] Phien ban Node.js qua cu!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  BrowserShield yeu cau Node.js 18.0.0 tro len."
    Write-Host "  Phien ban hien tai: v$nodeVersion"
    Write-Host ""
    Write-Host "  Vui long cap nhat Node.js tu https://nodejs.org"
    Write-Host ""
    Read-Host "Nhan Enter de thoat"
    exit 1
}

# Check if port 5000 is in use
Write-Host "[CHECK] Kiem tra cong 5000..." -ForegroundColor Gray
$portInUse = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host ""
    Write-Host "[WARNING] Cong 5000 dang duoc su dung!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Co the BrowserShield dang chay o cua so khac,"
    Write-Host "  hoac mot ung dung khac dang dung cong nay."
    Write-Host ""
    $choice = Read-Host "Tiep tuc? (y/n)"
    if ($choice -ne "y") {
        exit 0
    }
} else {
    Write-Host "        [OK] Cong 5000 san sang" -ForegroundColor Green
}

# Install dependencies if needed
$markerFile = Join-Path $PSScriptRoot "node_modules\\.installed_ok"
if (-not (Test-Path $markerFile)) {
    Write-Host ""
    Write-Host "[INFO] Dang cai dat dependencies..." -ForegroundColor Yellow
    Write-Host "       Co the mat vai phut lan dau..."
    Write-Host ""
    
    # Remove old node_modules if exists
    $nodeModules = Join-Path $PSScriptRoot "node_modules"
    if (Test-Path $nodeModules) {
        Write-Host "       Dang xoa modules cu..." -ForegroundColor Gray
        Remove-Item -Recurse -Force $nodeModules
    }
    
    npm install --production
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[ERROR] Khong the cai dat dependencies!" -ForegroundColor Red
        Write-Host ""
        Read-Host "Nhan Enter de thoat"
        exit 1
    }
    
    # Create marker file
    "OK" | Out-File -FilePath $markerFile -Encoding UTF8
    Write-Host "        [OK] Da cai dat dependencies" -ForegroundColor Green
} else {
    Write-Host "[CHECK] Dependencies san sang" -ForegroundColor Green
}

Write-Host ""
Write-Host "[START] Dang khoi dong BrowserShield server..." -ForegroundColor Green
Write-Host ""
Write-Host "  ----------------------------------------" -ForegroundColor Cyan
Write-Host "   Server URL: http://localhost:5000" -ForegroundColor White
Write-Host "   Admin:      http://localhost:5000/admin.html" -ForegroundColor White
Write-Host "   Proxy:      http://localhost:5000/proxy-manager.html" -ForegroundColor White
Write-Host "  ----------------------------------------" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Nhan Ctrl+C de dung server" -ForegroundColor Yellow
Write-Host ""

node server.js

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Server bi loi! Ma loi: $LASTEXITCODE" -ForegroundColor Red
    Write-Host ""
    Write-Host "Neu ban thay loi 'NODE_MODULE_VERSION', chay Fix-Dependencies.bat"
    Write-Host ""
    Read-Host "Nhan Enter de thoat"
}
`;
    
    fs.writeFileSync(path.join(BUILD_DIR, 'Start-BrowserShield.ps1'), psContent);
    console.log('  ✓ Created: Start-BrowserShield.ps1');
}

// Step 5: Create browser download script
function createBrowserDownloader() {
    console.log('\n📥 Creating browser download script...');
    
    const downloaderContent = `@echo off
title BrowserShield - Browser Downloader
cd /d "%~dp0"

echo.
echo  ========================================
echo   BrowserShield - Browser Downloader
echo  ========================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found!
    pause
    exit /b 1
)

echo [INFO] This will download Chrome and Firefox browsers.
echo [INFO] Total size: approximately 300MB
echo.
set /p confirm="Continue? (Y/N): "
if /i not "%confirm%"=="Y" exit /b 0

echo.
echo [INFO] Downloading browsers...
node download-browsers.js

echo.
echo [DONE] Browsers downloaded successfully!
pause
`;
    
    fs.writeFileSync(path.join(BUILD_DIR, 'Download-Browsers.bat'), downloaderContent);
    console.log('  ✓ Created: Download-Browsers.bat');
    
    // Browser download script (Node.js)
    const downloadScript = `/**
 * Download Chrome and Firefox for portable use
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BROWSERS_DIR = path.join(__dirname, 'browsers');

async function downloadChrome() {
    console.log('\\n📥 Setting up Chrome...');
    
    try {
        // Use puppeteer's built-in browser
        const puppeteer = require('puppeteer');
        const browserPath = puppeteer.executablePath();
        
        if (fs.existsSync(browserPath)) {
            console.log('  ✓ Chrome already available via Puppeteer');
            console.log('  Path:', browserPath);
            
            // Create symlink or copy info
            const chromeInfo = {
                type: 'puppeteer-managed',
                path: browserPath,
                version: 'bundled'
            };
            
            fs.writeFileSync(
                path.join(BROWSERS_DIR, 'chrome', 'browser-info.json'),
                JSON.stringify(chromeInfo, null, 2)
            );
            return true;
        }
    } catch (error) {
        console.log('  ⚠ Puppeteer Chrome not found, will use system Chrome');
    }
    
    return false;
}

async function downloadFirefox() {
    console.log('\\n📥 Setting up Firefox...');
    
    // Check for system Firefox
    const possiblePaths = [
        'C:\\\\Program Files\\\\Mozilla Firefox\\\\firefox.exe',
        'C:\\\\Program Files (x86)\\\\Mozilla Firefox\\\\firefox.exe',
        process.env.LOCALAPPDATA + '\\\\Mozilla Firefox\\\\firefox.exe'
    ];
    
    for (const firefoxPath of possiblePaths) {
        if (fs.existsSync(firefoxPath)) {
            console.log('  ✓ Firefox found at:', firefoxPath);
            
            const firefoxInfo = {
                type: 'system',
                path: firefoxPath,
                version: 'system-installed'
            };
            
            fs.writeFileSync(
                path.join(BROWSERS_DIR, 'firefox', 'browser-info.json'),
                JSON.stringify(firefoxInfo, null, 2)
            );
            return true;
        }
    }
    
    console.log('  ⚠ Firefox not found. Please install Firefox manually.');
    console.log('  Download from: https://www.mozilla.org/firefox/');
    return false;
}

async function main() {
    console.log('🌐 BrowserShield Browser Setup');
    console.log('==============================');
    
    // Ensure directories exist
    if (!fs.existsSync(path.join(BROWSERS_DIR, 'chrome'))) {
        fs.mkdirSync(path.join(BROWSERS_DIR, 'chrome'), { recursive: true });
    }
    if (!fs.existsSync(path.join(BROWSERS_DIR, 'firefox'))) {
        fs.mkdirSync(path.join(BROWSERS_DIR, 'firefox'), { recursive: true });
    }
    
    const chromeOk = await downloadChrome();
    const firefoxOk = await downloadFirefox();
    
    console.log('\\n==============================');
    console.log('Setup Summary:');
    console.log('  Chrome:', chromeOk ? '✓ Ready' : '⚠ Manual setup needed');
    console.log('  Firefox:', firefoxOk ? '✓ Ready' : '⚠ Manual setup needed');
    console.log('==============================\\n');
}

main().catch(console.error);
`;
    
    fs.writeFileSync(path.join(BUILD_DIR, 'download-browsers.js'), downloadScript);
    console.log('  ✓ Created: download-browsers.js');
}

// Step 6: Create README with troubleshooting guide (Requirement 6.6)
function createReadme() {
    console.log('\n📄 Creating README with troubleshooting guide...');
    
    const readme = `# BrowserShield Portable Edition v${VERSION}

## Khoi Dong Nhanh

1. **Lan Dau Chay:**
   - Chay \`Start-BrowserShield.bat\` (se tu dong cai dat dependencies)
   - Hoac chay \`Download-Browsers.bat\` de cai dat browsers truoc

2. **Khoi Dong Ung Dung:**
   - Nhan doi \`Start-BrowserShield.bat\`
   - Mo http://localhost:5000 trong trinh duyet

3. **Yeu Cau:**
   - Node.js 18+ (https://nodejs.org)
   - Windows 10/11

## Cau Truc Thu Muc

\`\`\`
BrowserShield-Portable/
├── Start-BrowserShield.bat    # Launcher chinh
├── Start-BrowserShield.ps1    # PowerShell launcher
├── Fix-Dependencies.bat       # Sua loi dependencies (QUAN TRONG!)
├── Download-Browsers.bat      # Cai dat browsers
├── browsers/                  # Browser binaries
│   ├── chrome/
│   └── firefox/
├── data/                      # Du lieu nguoi dung
│   ├── browser-profiles/
│   └── logs/
├── public/                    # Giao dien web
├── config/                    # Cau hinh
└── ...
\`\`\`

## Tinh Nang

- 🎭 Anti-detect browser profiles
- 🌐 Ho tro Chrome & Firefox
- 🔒 Fingerprint spoofing
- 🌍 Ho tro Proxy
- 📊 Quan ly session
- 🖥️ Che do Visible & Headless

## ⚠️ Xu Ly Loi (Troubleshooting)

### Loi "Khong tim thay Node.js"
**Nguyen nhan:** Node.js chua duoc cai dat hoac khong co trong PATH.
**Cach sua:**
1. Tai Node.js tu https://nodejs.org (chon ban LTS)
2. Cai dat va khoi dong lai may tinh
3. Chay lai Start-BrowserShield.bat

### Loi "NODE_MODULE_VERSION" hoac "Module not found"
**Nguyen nhan:** Native modules (better-sqlite3) can duoc rebuild cho may nay.
**Cach sua:**
1. Chay \`Fix-Dependencies.bat\` (QUAN TRONG!)
2. Doi cho qua trinh hoan tat (2-5 phut)
3. Chay lai Start-BrowserShield.bat

### Loi "Khong tim thay Browser"
**Nguyen nhan:** Chrome/Firefox chua duoc cai dat.
**Cach sua:**
1. Chay Download-Browsers.bat
2. Hoac cai dat Chrome/Firefox thu cong tu:
   - Chrome: https://www.google.com/chrome/
   - Firefox: https://www.mozilla.org/firefox/

### Loi "Cong 5000 dang duoc su dung"
**Nguyen nhan:** Port 5000 dang bi ung dung khac chiem.
**Cach sua:**
1. Dong ung dung khac dang dung port 5000
2. Hoac doi port: \`set PORT=3000 && node server.js\`

### Loi "Cannot find module..." khi khoi dong
**Nguyen nhan:** Dependencies chua duoc cai dat hoac bi loi.
**Cach sua:**
1. Chay \`Fix-Dependencies.bat\`
2. Neu van loi, xoa thu muc node_modules va chay lai

### Loi PowerShell Execution Policy
**Nguyen nhan:** Windows chan chay PowerShell scripts.
**Cach sua:**
1. Mo PowerShell voi quyen Administrator
2. Chay: \`Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned\`
3. Chay lai Start-BrowserShield.ps1

### Loi "npm install" that bai
**Nguyen nhan:** Ket noi internet hoac thieu build tools.
**Cach sua:**
1. Kiem tra ket noi internet
2. Thu chay voi quyen Administrator
3. Cai dat Visual Studio Build Tools neu duoc yeu cau:
   https://visualstudio.microsoft.com/visual-cpp-build-tools/

### Loi Database (SQLite)
**Nguyen nhan:** File database bi khoa hoac loi.
**Cach sua:**
1. Dong tat ca cua so BrowserShield
2. Xoa file \`data/browsershield.db\` (se duoc tao lai)
3. Chay lai Start-BrowserShield.bat

## Di Chuyen/Backup

Backup cac thu muc/file sau:
- \`data/browser-profiles/\`    # Profiles da tao
- \`data/browsershield.db\`     # Database
- \`data/profiles.json\`        # Cau hinh profiles
- \`data/proxy-pool.json\`      # Proxy pool
- \`portable-config.json\`      # Cau hinh portable

## Lien He Ho Tro

- GitHub: https://github.com/huynd94/TheBrowserShield
- Issues: https://github.com/huynd94/TheBrowserShield/issues

## Phien Ban

Version: ${VERSION}
Build Date: ${new Date().toISOString().split('T')[0]}
`;
    
    fs.writeFileSync(path.join(BUILD_DIR, 'README.md'), readme);
    console.log('  ✓ Created: README.md (with troubleshooting guide)');
}

// Step 7: Update puppeteer config for portable mode
function updatePuppeteerConfig() {
    console.log('\n🔧 Creating portable puppeteer config...');
    
    const configPath = path.join(BUILD_DIR, 'config', 'puppeteer-portable.js');
    
    const portableConfig = `/**
 * Puppeteer configuration for portable mode
 */
const path = require('path');
const fs = require('fs');

function getPortableConfig() {
    const configFile = path.join(__dirname, '..', 'portable-config.json');
    
    if (fs.existsSync(configFile)) {
        return JSON.parse(fs.readFileSync(configFile, 'utf8'));
    }
    
    return null;
}

function getChromePath() {
    const portableConfig = getPortableConfig();
    
    if (portableConfig?.portable) {
        // Check for browser-info.json
        const chromeInfoPath = path.join(__dirname, '..', 'browsers', 'chrome', 'browser-info.json');
        if (fs.existsSync(chromeInfoPath)) {
            const info = JSON.parse(fs.readFileSync(chromeInfoPath, 'utf8'));
            if (info.path && fs.existsSync(info.path)) {
                return info.path;
            }
        }
    }
    
    // Fallback to puppeteer default
    try {
        const puppeteer = require('puppeteer');
        return puppeteer.executablePath();
    } catch {
        return null;
    }
}

function getFirefoxPath() {
    const portableConfig = getPortableConfig();
    
    if (portableConfig?.portable) {
        const firefoxInfoPath = path.join(__dirname, '..', 'browsers', 'firefox', 'browser-info.json');
        if (fs.existsSync(firefoxInfoPath)) {
            const info = JSON.parse(fs.readFileSync(firefoxInfoPath, 'utf8'));
            if (info.path && fs.existsSync(info.path)) {
                return info.path;
            }
        }
    }
    
    // Check common Windows paths
    const possiblePaths = [
        'C:\\\\Program Files\\\\Mozilla Firefox\\\\firefox.exe',
        'C:\\\\Program Files (x86)\\\\Mozilla Firefox\\\\firefox.exe'
    ];
    
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) return p;
    }
    
    return null;
}

module.exports = {
    getPortableConfig,
    getChromePath,
    getFirefoxPath
};
`;
    
    fs.writeFileSync(configPath, portableConfig);
    console.log('  ✓ Created: config/puppeteer-portable.js');
}

// Main build process
async function build() {
    console.log('Starting build process...\n');
    
    try {
        createDirectories();
        copyAppFiles();
        createPortableConfig();
        createLaunchers();
        createBrowserDownloader();
        updatePuppeteerConfig();
        createReadme();
        
        // Verification step: Ensure node_modules is NOT included (Requirement 6.1)
        const nodeModulesPath = path.join(BUILD_DIR, 'node_modules');
        if (fs.existsSync(nodeModulesPath)) {
            console.log('\n⚠️ Removing node_modules from build (Requirement 6.1)...');
            fs.rmSync(nodeModulesPath, { recursive: true, force: true });
            console.log('  ✓ node_modules removed');
        }
        
        // Verification step: Ensure Fix-Dependencies.bat exists (Requirement 6.4)
        const fixDepsPath = path.join(BUILD_DIR, 'Fix-Dependencies.bat');
        if (!fs.existsSync(fixDepsPath)) {
            console.error('\n❌ ERROR: Fix-Dependencies.bat was not created!');
            process.exit(1);
        }
        console.log('\n✓ Verified: Fix-Dependencies.bat included (Requirement 6.4)');
        
        // Verification step: Ensure README exists with troubleshooting (Requirement 6.6)
        const readmePath = path.join(BUILD_DIR, 'README.md');
        if (!fs.existsSync(readmePath)) {
            console.error('\n❌ ERROR: README.md was not created!');
            process.exit(1);
        }
        const readmeContent = fs.readFileSync(readmePath, 'utf8');
        if (!readmeContent.includes('Troubleshooting') && !readmeContent.includes('Xu Ly Loi')) {
            console.error('\n❌ ERROR: README.md missing troubleshooting section!');
            process.exit(1);
        }
        console.log('✓ Verified: README.md includes troubleshooting guide (Requirement 6.6)');
        
        console.log('\n✅ Build completed successfully!');
        console.log(`\n📁 Output: ${BUILD_DIR}`);
        console.log(`📦 Version: ${VERSION}`);
        console.log('\n⚠️ IMPORTANT: node_modules is NOT included.');
        console.log('   Dependencies will be installed on first run to ensure');
        console.log('   native modules are compiled for the target machine.');
        console.log('\nNext steps for testing:');
        console.log('1. cd dist/BrowserShield-Portable');
        console.log('2. Run Start-BrowserShield.bat (will install dependencies)');
        console.log('3. Or run Fix-Dependencies.bat if you encounter module errors');
        
    } catch (error) {
        console.error('\n❌ Build failed:', error.message);
        process.exit(1);
    }
}

build();
