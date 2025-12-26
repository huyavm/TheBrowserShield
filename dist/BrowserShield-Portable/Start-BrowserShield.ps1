# BrowserShield Portable Launcher (PowerShell)
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
$embeddedNode = Join-Path $PSScriptRoot "runtime\nodejs\node.exe"
if (Test-Path $embeddedNode) {
    $env:PATH = "$(Join-Path $PSScriptRoot 'runtime\nodejs');$env:PATH"
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
$markerFile = Join-Path $PSScriptRoot "node_modules\.installed_ok"
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
