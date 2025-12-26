@echo off
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
