@echo off
REM BrowserShield Launcher Script
REM This script starts the Node.js server and opens the browser

REM Set working directory to the installation folder
cd /d "%~dp0"

REM Set title for the console window
title BrowserShield Server

REM Check if node.exe exists
if not exist "node.exe" (
    echo ERROR: node.exe not found in installation directory
    echo Please reinstall BrowserShield
    pause
    exit /b 1
)

REM Check if server.js exists
if not exist "server.js" (
    echo ERROR: server.js not found in installation directory
    echo Please reinstall BrowserShield
    pause
    exit /b 1
)

REM Display startup message
echo ============================================
echo   BrowserShield Anti-Detect Browser Manager
echo ============================================
echo.
echo Starting server...
echo.

REM Start the Node.js server in the background
start /b "" "node.exe" "server.js"

REM Store the server process ID (not directly available in batch, but we can check port)
set SERVER_PORT=5000
set MAX_WAIT=30
set WAIT_COUNT=0

REM Wait for server to be ready (check if port 5000 is listening)
:wait_loop
timeout /t 1 /nobreak >nul
set /a WAIT_COUNT+=1

REM Check if server is responding using PowerShell
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:%SERVER_PORT%/health' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 goto server_ready

REM Check if we've waited too long
if %WAIT_COUNT% geq %MAX_WAIT% (
    echo.
    echo WARNING: Server may not have started properly.
    echo Please check the console for errors.
    echo.
    goto open_browser
)

echo Waiting for server to start... (%WAIT_COUNT%/%MAX_WAIT%)
goto wait_loop

:server_ready
echo.
echo Server started successfully!
echo.

:open_browser
REM Open default browser to localhost:5000
echo Opening browser to http://localhost:%SERVER_PORT%
start "" "http://localhost:%SERVER_PORT%"

echo.
echo ============================================
echo   BrowserShield is running!
echo   Access: http://localhost:%SERVER_PORT%
echo   Press Ctrl+C to stop the server
echo ============================================
echo.

REM Keep the window open and wait for the server process
REM This allows the user to see server logs and stop with Ctrl+C
:keep_alive
timeout /t 5 /nobreak >nul
REM Check if server is still running
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:%SERVER_PORT%/health' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 goto keep_alive

REM Server stopped
echo.
echo Server has stopped.
pause
