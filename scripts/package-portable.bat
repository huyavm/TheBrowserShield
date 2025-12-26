@echo off
title BrowserShield - Package Portable App
echo.
echo  ========================================
echo   BrowserShield - Package Portable App
echo  ========================================
echo.

REM Build portable app
echo [1/4] Building portable app...
node scripts/build-portable.js
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

REM Install dependencies
echo.
echo [2/4] Installing dependencies...
pushd dist\BrowserShield-Portable
call npm install --production --silent
popd

REM Setup browsers
echo.
echo [3/4] Setting up browsers...
pushd dist\BrowserShield-Portable
node download-browsers.js
popd

REM Create ZIP file
echo.
echo [4/4] Creating ZIP package...
powershell -Command "Compress-Archive -Path 'dist\BrowserShield-Portable\*' -DestinationPath 'dist\BrowserShield-Portable-v1.3.0.zip' -Force"

echo.
echo  ========================================
echo   Build Complete!
echo  ========================================
echo.
echo   Output files:
echo   - dist\BrowserShield-Portable\     (folder)
echo   - dist\BrowserShield-Portable-v1.3.0.zip
echo.
echo   To use:
echo   1. Extract ZIP to any folder
echo   2. Run Start-BrowserShield.bat
echo.
pause
