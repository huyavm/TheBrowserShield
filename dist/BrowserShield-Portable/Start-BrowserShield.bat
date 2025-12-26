@echo off
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
if exist "runtime\nodejs\node.exe" (
    set "PATH=%~dp0runtime\nodejs;%PATH%"
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
powershell -Command "$ProgressPreference = 'SilentlyContinue'; Write-Host 'Dang tai...' -ForegroundColor Yellow; Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%TEMP%\%NODE_INSTALLER%'; Write-Host 'Tai xong!' -ForegroundColor Green"

if not exist "%TEMP%\%NODE_INSTALLER%" (
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
msiexec /i "%TEMP%\%NODE_INSTALLER%" /passive /norestart

REM Clean up
del "%TEMP%\%NODE_INSTALLER%" 2>nul

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
if not exist "node_modules\.installed_ok" (
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
    echo OK > "node_modules\.installed_ok"
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
