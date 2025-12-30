# BrowserShield Launcher
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
$serverProcess = Start-Process -FilePath ".\node.exe" -ArgumentList "server.js" -PassThru -NoNewWindow

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
