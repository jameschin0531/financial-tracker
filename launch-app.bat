@echo off
REM Financial Tracker Desktop Launcher
REM This script launches the Electron app without requiring a build

cd /d "%~dp0"
echo Starting Financial Tracker...
echo.

REM Check if Bun is available
where bun >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Bun is not installed or not in PATH
    echo Please install Bun from https://bun.sh
    pause
    exit /b 1
)

REM Check if Electron is installed
if not exist "node_modules\electron" (
    echo Installing Electron dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Start the Electron app
echo Launching Financial Tracker...
call npm run electron

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to start the application
    pause
    exit /b 1
)

