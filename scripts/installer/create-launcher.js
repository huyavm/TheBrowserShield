/**
 * BrowserShield Launcher EXE Creator
 * 
 * This script creates a Windows executable from the launcher batch script
 * using IExpress (built-in Windows tool) or generates a VBScript wrapper.
 * 
 * Requirements: 4.3 - THE Shortcuts SHALL launch the application correctly
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Configuration
const CONFIG = {
    batchFile: 'launcher.bat',
    outputExe: 'BrowserShield.exe',
    appName: 'BrowserShield',
    appVersion: '1.4.0',
    iconFile: 'icon.ico',
    sedFile: 'launcher.sed'
};

/**
 * Check if a command exists on the system
 * @param {string} command - Command to check
 * @returns {boolean}
 */
function commandExists(command) {
    try {
        execSync(`where ${command}`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Create IExpress SED (Self-Extraction Directive) file
 * This is the configuration file for IExpress
 * @param {string} buildDir - Build directory path
 * @param {string} iconPath - Path to icon file (optional)
 * @returns {string} - Path to created SED file
 */
function createSedFile(buildDir, iconPath = null) {
    const sedPath = path.join(buildDir, CONFIG.sedFile);
    const batchPath = path.join(buildDir, CONFIG.batchFile);
    const outputPath = path.join(buildDir, CONFIG.outputExe);
    
    // IExpress SED file content
    let sedContent = `[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=0
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=
DisplayLicense=
FinishMessage=
TargetName=${outputPath}
FriendlyName=${CONFIG.appName}
AppLaunched=cmd /c "${CONFIG.batchFile}"
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles
[Strings]
FILE0="${CONFIG.batchFile}"
[SourceFiles]
SourceFiles0=${buildDir}\\
[SourceFiles0]
%FILE0%=
`;

    fs.writeFileSync(sedPath, sedContent, 'utf8');
    console.log(`✅ Created SED file: ${sedPath}`);
    return sedPath;
}

/**
 * Create launcher using IExpress (Windows built-in)
 * @param {string} buildDir - Build directory path
 * @param {string} iconPath - Path to icon file (optional)
 * @returns {Promise<string>} - Path to created EXE
 */
async function createWithIExpress(buildDir, iconPath = null) {
    console.log('📦 Creating launcher EXE using IExpress...');
    
    // Ensure batch file exists
    const batchPath = path.join(buildDir, CONFIG.batchFile);
    if (!fs.existsSync(batchPath)) {
        throw new Error(`Batch file not found: ${batchPath}`);
    }
    
    // Create SED file
    const sedPath = createSedFile(buildDir, iconPath);
    
    // Run IExpress
    const outputPath = path.join(buildDir, CONFIG.outputExe);
    
    try {
        execSync(`iexpress /N /Q "${sedPath}"`, {
            stdio: 'inherit',
            cwd: buildDir
        });
        
        if (fs.existsSync(outputPath)) {
            console.log(`✅ Created launcher EXE: ${outputPath}`);
            return outputPath;
        } else {
            throw new Error('IExpress did not create output file');
        }
    } catch (error) {
        console.warn('⚠️ IExpress failed, falling back to VBScript wrapper');
        return createWithVBScript(buildDir, iconPath);
    }
}

/**
 * Create a VBScript wrapper that launches the batch file without showing console
 * This is a fallback method if IExpress fails
 * @param {string} buildDir - Build directory path
 * @param {string} iconPath - Path to icon file (optional)
 * @returns {string} - Path to created VBS file
 */
function createWithVBScript(buildDir, iconPath = null) {
    console.log('📦 Creating VBScript launcher wrapper...');
    
    const vbsPath = path.join(buildDir, 'BrowserShield.vbs');
    
    // VBScript that runs the batch file
    // Using WScript.Shell to run the batch file
    const vbsContent = `' BrowserShield Launcher
' This script launches the BrowserShield server

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Change to the script directory
WshShell.CurrentDirectory = scriptDir

' Check if required files exist
If Not fso.FileExists(scriptDir & "\\node.exe") Then
    MsgBox "ERROR: node.exe not found in installation directory." & vbCrLf & _
           "Please reinstall BrowserShield.", vbCritical, "BrowserShield Error"
    WScript.Quit 1
End If

If Not fso.FileExists(scriptDir & "\\server.js") Then
    MsgBox "ERROR: server.js not found in installation directory." & vbCrLf & _
           "Please reinstall BrowserShield.", vbCritical, "BrowserShield Error"
    WScript.Quit 1
End If

' Start the Node.js server
' Using cmd /c to run in a new window that stays open
WshShell.Run "cmd /k title BrowserShield Server && node.exe server.js", 1, False

' Wait for server to start (3 seconds)
WScript.Sleep 3000

' Open browser to localhost:5000
WshShell.Run "http://localhost:5000", 1, False
`;

    fs.writeFileSync(vbsPath, vbsContent, 'utf8');
    console.log(`✅ Created VBScript launcher: ${vbsPath}`);
    
    // Also create a batch file that can be converted to EXE using other tools
    createBatchWrapper(buildDir);
    
    return vbsPath;
}

/**
 * Create a simple batch wrapper for the launcher
 * This can be used with third-party bat-to-exe converters
 * @param {string} buildDir - Build directory path
 */
function createBatchWrapper(buildDir) {
    const wrapperPath = path.join(buildDir, 'BrowserShield-launcher.bat');
    
    const wrapperContent = `@echo off
REM BrowserShield Launcher Wrapper
REM This wrapper starts the main launcher script

cd /d "%~dp0"

REM Start the VBScript launcher (hidden console)
if exist "BrowserShield.vbs" (
    cscript //nologo "BrowserShield.vbs"
) else (
    REM Fallback to direct batch execution
    call "launcher.bat"
)
`;

    fs.writeFileSync(wrapperPath, wrapperContent, 'utf8');
    console.log(`✅ Created batch wrapper: ${wrapperPath}`);
}

/**
 * Create a PowerShell-based launcher script
 * This provides better control and can be converted to EXE using PS2EXE
 * @param {string} buildDir - Build directory path
 * @param {string} iconPath - Path to icon file (optional)
 * @returns {string} - Path to created PS1 file
 */
function createPowerShellLauncher(buildDir, iconPath = null) {
    console.log('📦 Creating PowerShell launcher...');
    
    const ps1Path = path.join(buildDir, 'BrowserShield.ps1');
    
    const ps1Content = `# BrowserShield Launcher
# This script starts the BrowserShield server and opens the browser

$ErrorActionPreference = "Stop"

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Configuration
$serverPort = 5000
$maxWaitSeconds = 30

# Check required files
if (-not (Test-Path "node.exe")) {
    [System.Windows.Forms.MessageBox]::Show(
        "ERROR: node.exe not found in installation directory." + [char]10 + "Please reinstall BrowserShield.",
        "BrowserShield Error",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
    )
    exit 1
}

if (-not (Test-Path "server.js")) {
    [System.Windows.Forms.MessageBox]::Show(
        "ERROR: server.js not found in installation directory." + [char]10 + "Please reinstall BrowserShield.",
        "BrowserShield Error",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
    )
    exit 1
}

Write-Host "============================================"
Write-Host "  BrowserShield Anti-Detect Browser Manager"
Write-Host "============================================"
Write-Host ""
Write-Host "Starting server..."

# Start Node.js server
$serverProcess = Start-Process -FilePath ".\\node.exe" -ArgumentList "server.js" -PassThru -NoNewWindow

# Wait for server to be ready
$waitCount = 0
$serverReady = $false

while ($waitCount -lt $maxWaitSeconds -and -not $serverReady) {
    Start-Sleep -Seconds 1
    $waitCount++
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$serverPort/health" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $serverReady = $true
        }
    } catch {
        Write-Host "Waiting for server to start... ($waitCount/$maxWaitSeconds)"
    }
}

if ($serverReady) {
    Write-Host ""
    Write-Host "Server started successfully!"
    Write-Host ""
    
    # Open browser
    Start-Process "http://localhost:$serverPort"
    
    Write-Host "============================================"
    Write-Host "  BrowserShield is running!"
    Write-Host "  Access: http://localhost:$serverPort"
    Write-Host "  Close this window to stop the server"
    Write-Host "============================================"
    
    # Wait for server process to exit
    $serverProcess.WaitForExit()
} else {
    Write-Host ""
    Write-Host "WARNING: Server may not have started properly."
    Write-Host "Opening browser anyway..."
    Start-Process "http://localhost:$serverPort"
}

Write-Host ""
Write-Host "Server has stopped."
Read-Host "Press Enter to exit"
`;

    fs.writeFileSync(ps1Path, ps1Content, 'utf8');
    console.log(`✅ Created PowerShell launcher: ${ps1Path}`);
    
    return ps1Path;
}

/**
 * Copy icon file to build directory if it exists
 * @param {string} sourceDir - Source directory
 * @param {string} buildDir - Build directory
 * @returns {string|null} - Path to icon file or null
 */
function copyIconFile(sourceDir, buildDir) {
    const possibleIconPaths = [
        path.join(sourceDir, 'public', 'icon.ico'),
        path.join(sourceDir, 'public', 'favicon.ico'),
        path.join(sourceDir, 'icon.ico')
    ];
    
    for (const iconPath of possibleIconPaths) {
        if (fs.existsSync(iconPath)) {
            const destPath = path.join(buildDir, 'icon.ico');
            fs.copyFileSync(iconPath, destPath);
            console.log(`✅ Copied icon file: ${destPath}`);
            return destPath;
        }
    }
    
    console.log('ℹ️ No icon file found, using default Windows icon');
    return null;
}

/**
 * Main function to create the launcher executable
 * @param {Object} options - Options
 * @param {string} options.buildDir - Build directory path
 * @param {string} options.sourceDir - Source directory path
 * @returns {Promise<Object>} - Result object
 */
async function createLauncher(options = {}) {
    const {
        buildDir = path.join(__dirname, '../../dist/build'),
        sourceDir = path.join(__dirname, '../..')
    } = options;
    
    console.log('🚀 Creating BrowserShield Launcher...');
    console.log(`   Build directory: ${buildDir}`);
    console.log(`   Source directory: ${sourceDir}`);
    
    // Ensure build directory exists
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
    }
    
    // Copy launcher.bat to build directory
    const sourceBatch = path.join(__dirname, 'launcher.bat');
    const destBatch = path.join(buildDir, CONFIG.batchFile);
    
    if (fs.existsSync(sourceBatch)) {
        fs.copyFileSync(sourceBatch, destBatch);
        console.log(`✅ Copied launcher.bat to build directory`);
    } else {
        throw new Error(`Launcher batch file not found: ${sourceBatch}`);
    }
    
    // Copy icon file if available
    const iconPath = copyIconFile(sourceDir, buildDir);
    
    // Create launcher files
    const results = {
        success: true,
        files: []
    };
    
    try {
        // Try IExpress first (Windows built-in)
        const exePath = await createWithIExpress(buildDir, iconPath);
        results.files.push(exePath);
    } catch (error) {
        console.warn(`⚠️ IExpress method failed: ${error.message}`);
    }
    
    // Always create VBScript as backup
    const vbsPath = createWithVBScript(buildDir, iconPath);
    results.files.push(vbsPath);
    
    // Create PowerShell launcher for advanced users
    const ps1Path = createPowerShellLauncher(buildDir, iconPath);
    results.files.push(ps1Path);
    
    console.log('\n✅ Launcher creation complete!');
    console.log('   Created files:');
    results.files.forEach(file => {
        console.log(`   - ${path.basename(file)}`);
    });
    
    return results;
}

/**
 * Generate instructions for manual EXE creation
 * @param {string} buildDir - Build directory path
 */
function generateManualInstructions(buildDir) {
    const instructionsPath = path.join(buildDir, 'CREATE-EXE-INSTRUCTIONS.txt');
    
    const instructions = `BrowserShield Launcher EXE Creation Instructions
================================================

The launcher files have been created. To create a proper .exe file with an
embedded icon, you can use one of these methods:

Method 1: Use the VBScript Launcher (Recommended)
-------------------------------------------------
The BrowserShield.vbs file can be used directly as a launcher.
Create a shortcut to it and change the icon in shortcut properties.

Method 2: Use Bat To Exe Converter (Free)
-----------------------------------------
1. Download "Bat To Exe Converter" from https://www.battoexeconverter.com/
2. Open launcher.bat in the converter
3. Set the icon to icon.ico (if available)
4. Enable "Invisible application" if you want to hide the console
5. Click "Compile" to create BrowserShield.exe

Method 3: Use Advanced BAT to EXE Converter
-------------------------------------------
1. Download from https://www.battoexeconverter.com/
2. Similar steps as Method 2

Method 4: Use PS2EXE for PowerShell
-----------------------------------
1. Install PS2EXE: Install-Module -Name ps2exe
2. Run: Invoke-PS2EXE -InputFile BrowserShield.ps1 -OutputFile BrowserShield.exe -IconFile icon.ico

Method 5: Use IExpress (Windows Built-in)
-----------------------------------------
1. Run: iexpress /N launcher.sed
2. This creates a self-extracting archive

Note: The Inno Setup installer will use the VBScript or batch file directly,
which works well for most use cases.
`;

    fs.writeFileSync(instructionsPath, instructions, 'utf8');
    console.log(`✅ Created instructions: ${instructionsPath}`);
}

// Export functions for use in build script
module.exports = {
    createLauncher,
    createWithIExpress,
    createWithVBScript,
    createPowerShellLauncher,
    generateManualInstructions,
    CONFIG
};

// Run if called directly
if (require.main === module) {
    const args = process.argv.slice(2);
    const buildDir = args[0] || path.join(__dirname, '../../dist/build');
    
    createLauncher({ buildDir })
        .then(result => {
            if (result.success) {
                generateManualInstructions(buildDir);
                console.log('\n🎉 Done!');
                process.exit(0);
            } else {
                console.error('\n❌ Failed to create launcher');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n❌ Error:', error.message);
            process.exit(1);
        });
}
