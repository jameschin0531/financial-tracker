# Desktop Application Setup

This application can be run as a desktop app using Electron.

## Prerequisites

1. **Bun** must be installed and available in your PATH
   - Download from: https://bun.sh
   - The packaged app requires Bun to be installed on the user's system
   - If Bun is not found, the app will display an error message with installation instructions
2. **Node.js** (for Electron) - Electron requires Node.js

## Installation

1. Install Electron dependencies:
```bash
npm install --save-dev electron electron-builder cross-env
```

Or if you prefer using Bun:
```bash
bun add -d electron electron-builder cross-env
```

This will install:
- `electron` - The Electron framework
- `electron-builder` - For building distributable packages
- `cross-env` - For cross-platform environment variables

**Note**: Electron requires Node.js to be installed, even if you're using Bun for your app.

## Running as Desktop App

### Development Mode

Run the app in development mode (with DevTools):

```bash
bun run electron:dev
```

Or simply:

```bash
bun run electron
```

This will:
1. Start the Bun server on `http://localhost:3000`
2. Open an Electron window displaying your app
3. Open DevTools automatically (in dev mode)

### Production Mode

Run the app without DevTools:

```bash
NODE_ENV=production bun run electron
```

## Building Desktop Installers

### Windows

Build a Windows installer (NSIS):

```bash
npm run electron:build:win
```

Or set the environment variable to skip code signing:

```bash
set CSC_IDENTITY_AUTO_DISCOVERY=false && npm run electron:build:win
```

This creates:
- `dist-electron/Financial Tracker Setup x.x.x.exe` - Windows installer

**Note**: If you encounter "symbolic link" errors during build, you have several options:

1. **Run PowerShell as Administrator** (Recommended for building installers)
   - Right-click PowerShell → "Run as Administrator"
   - Navigate to project directory
   - Run `npm run electron:build:win`

2. **Enable Developer Mode in Windows** (Alternative)
   - Open Windows Settings → Update & Security → For developers
   - Enable "Developer Mode"
   - This allows creating symbolic links without admin privileges
   - Then run `npm run electron:build:win` normally

3. **Use Desktop Launcher Instead** (No installer needed)
   - Double-click `launch-app.bat` or `launch-app.ps1`
   - Or create a desktop shortcut to these files
   - The app works the same way, just without a packaged installer

### macOS

Build a macOS DMG:

```bash
bun run electron:build:mac
```

This creates:
- `dist-electron/Financial Tracker-x.x.x.dmg` - macOS disk image

### Linux

Build a Linux AppImage:

```bash
bun run electron:build:linux
```

This creates:
- `dist-electron/Financial Tracker-x.x.x.AppImage` - Linux AppImage

## Desktop Launcher (Alternative to Installer)

If you can't build an installer due to permission issues, you can use the desktop launcher scripts:

### Windows

1. **Using Batch File** (Easiest):
   - Double-click `launch-app.bat`
   - Or create a desktop shortcut to `launch-app.bat`

2. **Using PowerShell Script**:
   - Right-click `launch-app.ps1` → "Run with PowerShell"
   - Or create a desktop shortcut

### Creating a Desktop Shortcut

1. Right-click on `launch-app.bat` or `launch-app.ps1`
2. Select "Create shortcut"
3. Drag the shortcut to your Desktop
4. (Optional) Right-click the shortcut → Properties → Change Icon to customize

The launcher will:
- Check if Bun and Electron are installed
- Install dependencies if needed
- Launch the Financial Tracker app

**Note**: The app works exactly the same as a packaged installer - it just launches directly from the project folder.

### All Platforms

Build for all platforms:

```bash
bun run electron:build
```

## Application Icons

To add custom icons:

1. **Windows**: Place `icon.ico` in `assets/` folder
2. **macOS**: Place `icon.icns` in `assets/` folder  
3. **Linux**: Place `icon.png` (512x512) in `assets/` folder

If icons are not provided, Electron will use default icons.

### Creating Icons

You can create icons from a PNG image using online tools:
- **ICO**: https://convertio.co/png-ico/
- **ICNS**: https://cloudconvert.com/png-to-icns
- Or use tools like `electron-icon-maker`

## How It Works

1. **Main Process** (`electron/main.cjs`):
   - Starts the Bun server automatically
   - Creates the Electron window
   - Loads `http://localhost:3000` in the window
   - Handles app lifecycle (quit, close, etc.)

2. **Preload Script** (`electron/preload.cjs`):
   - Runs before the page loads
   - Can expose safe APIs to the renderer process

3. **Your App**:
   - Runs exactly as it does in the browser
   - All features work the same way
   - Data is stored in the same `data/` directory

## Distribution

After building, the installers will be in the `dist-electron/` directory:

- **Windows**: Share the `.exe` installer
- **macOS**: Share the `.dmg` file
- **Linux**: Share the `.AppImage` file

Users can install and run the app just like any other desktop application!

## Troubleshooting

### Server won't start

Make sure Bun is installed and in your PATH:
```bash
bun --version
```

### Port 3000 already in use

The app uses port 3000. If it's already in use, you can:
1. Close other applications using port 3000
2. Or modify `server.ts` to use a different port

### Build fails

Make sure all dependencies are installed:
```bash
bun install
```

### App window is blank

Check the console for errors. The server might not have started yet. Wait a few seconds and refresh (Ctrl+R or Cmd+R).

## Notes

- The Bun server runs in the background when the app starts
- Data is stored in the `data/` folder in the app directory
- The app works offline once the server is running
- All browser features (localStorage, etc.) work the same way

