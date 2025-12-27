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
      preload: path.join(__dirname, 'preload.cjs'),
    },
    titleBarStyle: 'default',
    show: false, // Don't show until ready
  });

  // Check if we're in development or production
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  // Start the Bun server
  // In packaged app, __dirname points to electron/main.cjs location
  // In dev, it's electron/ directory, in packaged it's resources/app/electron/
  const appPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'app')
    : path.join(__dirname, '..');
  const serverPath = path.join(appPath, 'server.ts');
  const bunPath = process.platform === 'win32' ? 'bun.exe' : 'bun';
  
  console.log('Starting Bun server...');
  console.log('Server path:', serverPath);
  console.log('Working directory:', path.join(__dirname, '..'));
  console.log('Is packaged:', app.isPackaged);
  console.log('Is dev:', isDev);
  
  // Check if Bun is available
  const { execSync } = require('child_process');
  let bunAvailable = false;
  try {
    execSync(`${bunPath} --version`, { stdio: 'ignore', timeout: 2000 });
    bunAvailable = true;
  } catch (error) {
    bunAvailable = false;
  }
  
  if (!bunAvailable) {
    console.error('Bun is not installed or not in PATH');
    mainWindow.loadURL(`data:text/html,${encodeURIComponent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Financial Tracker - Error</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .error-container {
              text-align: center;
              padding: 2rem;
              background: rgba(0, 0, 0, 0.3);
              border-radius: 12px;
              max-width: 600px;
            }
            h1 { margin-top: 0; }
            a { color: #fff; text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>⚠️ Bun Runtime Required</h1>
            <p>Financial Tracker requires Bun to be installed on your system.</p>
            <p><strong>Please install Bun:</strong></p>
            <p><a href="https://bun.sh" target="_blank">https://bun.sh</a></p>
            <p style="margin-top: 2rem; font-size: 0.9em; opacity: 0.8;">
              After installing Bun, restart the application.
            </p>
          </div>
        </body>
      </html>
    `)}`);
    mainWindow.show();
    return;
  }
  
  serverProcess = spawn(bunPath, ['run', serverPath], {
    cwd: appPath,
    stdio: isDev ? 'inherit' : 'pipe',
    shell: true,
    env: { ...process.env, PORT: '3000' },
  });

  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Financial Tracker - Server Error</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              color: white;
            }
            .error-container {
              text-align: center;
              padding: 2rem;
              background: rgba(0, 0, 0, 0.3);
              border-radius: 12px;
              max-width: 600px;
            }
            h1 { margin-top: 0; }
            code { background: rgba(0, 0, 0, 0.3); padding: 0.2em 0.4em; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>❌ Server Error</h1>
            <p>Failed to start the Bun server.</p>
            <p><code>${error.message}</code></p>
            <p style="margin-top: 2rem; font-size: 0.9em; opacity: 0.8;">
              Please check that Bun is installed and try again.
            </p>
          </div>
        </body>
      </html>
    `;
    mainWindow.loadURL(`data:text/html,${encodeURIComponent(errorHtml)}`);
    mainWindow.show();
  });

  // Capture server output for debugging
  if (!isDev && serverProcess.stdout) {
    serverProcess.stdout.on('data', (data) => {
      console.log(`Server: ${data}`);
    });
  }
  
  if (!isDev && serverProcess.stderr) {
    serverProcess.stderr.on('data', (data) => {
      console.error(`Server Error: ${data}`);
    });
  }

  // Wait for server to be ready
  let retries = 0;
  const maxRetries = 10;
  const checkServer = () => {
    const http = require('http');
    const req = http.get('http://localhost:3000', (res) => {
      console.log('Server is ready!');
      mainWindow.loadURL('http://localhost:3000');
      mainWindow.once('ready-to-show', () => {
        mainWindow.show();
      });
    });
    
    req.on('error', () => {
      retries++;
      if (retries < maxRetries) {
        setTimeout(checkServer, 500);
      } else {
        console.error('Server failed to start after multiple retries');
        const errorHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Financial Tracker - Connection Error</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                  color: white;
                }
                .error-container {
                  text-align: center;
                  padding: 2rem;
                  background: rgba(0, 0, 0, 0.3);
                  border-radius: 12px;
                  max-width: 600px;
                }
                h1 { margin-top: 0; }
              </style>
            </head>
            <body>
              <div class="error-container">
                <h1>⏱️ Server Starting...</h1>
                <p>The server is taking longer than expected to start.</p>
                <p style="margin-top: 2rem; font-size: 0.9em; opacity: 0.8;">
                  Please wait or restart the application.
                </p>
              </div>
            </body>
          </html>
        `;
        mainWindow.loadURL(`data:text/html,${encodeURIComponent(errorHtml)}`);
        mainWindow.show();
      }
    });
  };
  
  // Start checking after a short delay
  setTimeout(checkServer, 1000);

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

