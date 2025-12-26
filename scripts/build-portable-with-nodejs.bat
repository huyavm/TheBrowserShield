@echo off
title BrowserShield - Build Portable with Node.js
chcp 65001 >nul
setlocal enabledelayedexpansion
echo.
echo  ========================================
echo   BrowserShield - Build Portable + Node.js
echo  ========================================
echo.

REM Check if Node.js is installed on this machine
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found on this machine!
    echo Please install Node.js first to build the portable package.
    pause
    exit /b 1
)

REM Get version from package.json using Node.js
for /f "tokens=*" %%i in ('node -p "require('./package.json').version"') do set APP_VERSION=%%i
echo [INFO] Building version: %APP_VERSION%
echo.

echo [1/7] Building portable app...
node scripts/build-portable.js
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo [2/7] Removing pre-built node_modules (will be installed on target)...
if exist "dist\BrowserShield-Portable\node_modules" (
    rmdir /s /q "dist\BrowserShield-Portable\node_modules"
    echo         Removed to avoid native module conflicts.
) else (
    echo         Already excluded (good!)
)

echo.
echo [3/7] Downloading Node.js portable...
set NODE_VERSION=20.11.0
set NODE_FILE=node-v%NODE_VERSION%-win-x64
set NODE_URL=https://nodejs.org/dist/v%NODE_VERSION%/%NODE_FILE%.zip
set RUNTIME_DIR=dist\BrowserShield-Portable\runtime

if not exist "%RUNTIME_DIR%" mkdir "%RUNTIME_DIR%"

echo Downloading Node.js v%NODE_VERSION%...
powershell -Command "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%RUNTIME_DIR%\nodejs.zip'"

if not exist "%RUNTIME_DIR%\nodejs.zip" (
    echo [ERROR] Download failed!
    pause
    exit /b 1
)

echo.
echo [4/7] Extracting Node.js...
powershell -Command "Expand-Archive -Path '%RUNTIME_DIR%\nodejs.zip' -DestinationPath '%RUNTIME_DIR%' -Force"

REM Rename to nodejs folder
if exist "%RUNTIME_DIR%\nodejs" rmdir /s /q "%RUNTIME_DIR%\nodejs"
rename "%RUNTIME_DIR%\%NODE_FILE%" nodejs

REM Clean up zip
del "%RUNTIME_DIR%\nodejs.zip"

echo.
echo [5/7] Creating launcher scripts...

REM Main launcher
(
echo @echo off
echo title BrowserShield - Anti-Detect Browser Manager
echo chcp 65001 ^>nul
echo setlocal enabledelayedexpansion
echo cd /d "%%~dp0"
echo.
echo echo.
echo echo  ========================================
echo echo   BrowserShield - Portable Edition v%APP_VERSION%
echo echo  ========================================
echo echo.
echo.
echo REM Use embedded Node.js
echo set "PATH=%%~dp0runtime\nodejs;%%PATH%%"
echo.
echo echo [CHECK] Node.js...
echo for /f "tokens=*" %%%%i in ^('node --version'^) do echo         [OK] Node.js %%%%i
echo.
echo REM Check if dependencies need to be installed
echo if not exist "node_modules\.installed_ok" ^(
echo     echo [SETUP] Installing dependencies ^(first run^)...
echo     echo         This may take 2-5 minutes...
echo     echo.
echo     if exist "node_modules" rmdir /s /q node_modules
echo     call npm install --production
echo     if ^^!ERRORLEVEL^^! NEQ 0 ^(
echo         echo [ERROR] Failed to install dependencies!
echo         pause
echo         exit /b 1
echo     ^)
echo     echo OK ^> "node_modules\.installed_ok"
echo     echo.
echo     echo         [OK] Dependencies installed
echo ^) else ^(
echo     echo [CHECK] Dependencies... [OK]
echo ^)
echo.
echo echo.
echo echo [START] Launching BrowserShield server...
echo echo.
echo echo  ----------------------------------------
echo echo   Server URL: http://localhost:5000
echo echo   Admin:      http://localhost:5000/admin.html
echo echo   Proxy:      http://localhost:5000/proxy-manager.html
echo echo  ----------------------------------------
echo echo.
echo echo   Press Ctrl+C to stop the server
echo echo.
echo.
echo node server.js
echo.
echo echo.
echo echo [INFO] Server stopped.
echo pause
echo endlocal
) > dist\BrowserShield-Portable\Start-BrowserShield.bat

REM Fix dependencies script
(
echo @echo off
echo title BrowserShield - Fix Dependencies
echo chcp 65001 ^>nul
echo cd /d "%%~dp0"
echo.
echo echo.
echo echo  ========================================
echo echo   BrowserShield - Fix Dependencies
echo echo  ========================================
echo echo.
echo.
echo set "PATH=%%~dp0runtime\nodejs;%%PATH%%"
echo.
echo echo [INFO] Removing old modules...
echo if exist "node_modules" rmdir /s /q node_modules
echo.
echo echo [INFO] Installing fresh dependencies...
echo call npm install --production
echo.
echo if %%ERRORLEVEL%% EQU 0 ^(
echo     echo OK ^> "node_modules\.installed_ok"
echo     echo.
echo     echo [SUCCESS] Dependencies fixed! Run Start-BrowserShield.bat
echo ^) else ^(
echo     echo [ERROR] Installation failed!
echo ^)
echo pause
) > dist\BrowserShield-Portable\Fix-Dependencies.bat

echo.
echo [6/7] Creating ZIP package with version...
set ZIP_NAME=BrowserShield-Portable-Full-v%APP_VERSION%.zip
powershell -Command "Compress-Archive -Path 'dist\BrowserShield-Portable\*' -DestinationPath 'dist\%ZIP_NAME%' -Force"

echo.
echo [7/7] Validating build output...
echo.

REM Validation: Check ZIP was created
if not exist "dist\%ZIP_NAME%" (
    echo [ERROR] ZIP package was not created!
    pause
    exit /b 1
)
echo   [OK] ZIP package created: %ZIP_NAME%

REM Validation: Check node_modules is NOT in the package
if exist "dist\BrowserShield-Portable\node_modules" (
    echo [ERROR] node_modules should NOT be included!
    pause
    exit /b 1
)
echo   [OK] node_modules excluded (will install on first run)

REM Validation: Check Fix-Dependencies.bat exists
if not exist "dist\BrowserShield-Portable\Fix-Dependencies.bat" (
    echo [ERROR] Fix-Dependencies.bat is missing!
    pause
    exit /b 1
)
echo   [OK] Fix-Dependencies.bat included

REM Validation: Check README.md exists
if not exist "dist\BrowserShield-Portable\README.md" (
    echo [ERROR] README.md is missing!
    pause
    exit /b 1
)
echo   [OK] README.md included

REM Validation: Check embedded Node.js
if not exist "dist\BrowserShield-Portable\runtime\nodejs\node.exe" (
    echo [ERROR] Embedded Node.js is missing!
    pause
    exit /b 1
)
echo   [OK] Embedded Node.js included

echo.
echo  ========================================
echo   Build Complete! All validations passed.
echo  ========================================
echo.
echo   Output: dist\%ZIP_NAME%
echo   Version: %APP_VERSION%
echo.
echo   IMPORTANT: This package does NOT include node_modules.
echo   Dependencies will be installed on first run to ensure
echo   native modules are compiled for the target machine.
echo.
echo   First run may take 2-5 minutes to install dependencies.
echo.
endlocal
pause
