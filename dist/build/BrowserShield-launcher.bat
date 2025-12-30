@echo off
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
