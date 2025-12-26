@echo off
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
if exist "runtime\nodejs\node.exe" (
    set "PATH=%~dp0runtime\nodejs;%PATH%"
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
echo OK > "node_modules\.installed_ok"

echo.
echo  ========================================
echo   [THANH CONG] Da sua xong dependencies!
echo  ========================================
echo.
echo   Bay gio chay Start-BrowserShield.bat de khoi dong.
echo.
pause
