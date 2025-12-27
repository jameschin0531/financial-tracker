# Financial Tracker Desktop Launcher (PowerShell)
# This script launches the Electron app without requiring a build

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "Starting Financial Tracker..." -ForegroundColor Green
Write-Host ""

# Check if Bun is available
$bunExists = Get-Command bun -ErrorAction SilentlyContinue
if (-not $bunExists) {
    Write-Host "ERROR: Bun is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Bun from https://bun.sh" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if Electron is installed
if (-not (Test-Path "node_modules\electron")) {
    Write-Host "Installing Electron dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Start the Electron app
Write-Host "Launching Financial Tracker..." -ForegroundColor Green
npm run electron

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Failed to start the application" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

