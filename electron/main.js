const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;
let serverProcess;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, '../assets/icon.png'), // Optional: add icon later
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    titleBarStyle: 'default',
    show: false, // Don't show until ready
  });

  // Start the Bun server
  const serverPath = path.join(__dirname, '../../server.ts');
  const bunPath = process.platform === 'win32' ? 'bun.exe' : 'bun';
  
  console.log('Starting Bun server...');
  serverProcess = spawn(bunPath, ['run', serverPath], {
    cwd: path.join(__dirname, '../..'),
    stdio: 'inherit',
    shell: true,
  });

  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
    app.quit();
  });

  // Wait a moment for server to start, then load the app
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });
  }, 2000);

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  }
});

// Cleanup on app quit
app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Handle any uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

