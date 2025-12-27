# Fixing Electron Builder Symbolic Link Error on Windows

If you encounter the error:
```
ERROR: Cannot create symbolic link : A required privilege is not held by the client.
```

This happens because electron-builder tries to download code signing tools that contain macOS files with symbolic links.

## Solution 1: Run PowerShell as Administrator (Recommended)

1. Right-click PowerShell
2. Select "Run as Administrator"
3. Navigate to your project directory
4. Run: `npm run electron:build:win`

## Solution 2: Use Environment Variable (Already Configured)

The build script is already configured to skip code signing. Just run:

```bash
npm run electron:build:win
```

If it still fails, manually set the environment variable:

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"
$env:WIN_CSC_LINK=""
npm run electron:build:win
```

## Solution 3: Clear Electron Builder Cache

Sometimes clearing the cache helps:

```powershell
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache"
npm run electron:build:win
```

## Solution 4: Build Without Installer (Portable)

If you just want to test the app without creating an installer:

1. Run: `npm run electron` (this runs the app directly)
2. Create a shortcut to this command on your desktop

The app will work the same way, just without a packaged installer.

