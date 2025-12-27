// Preload script - runs in renderer process before page loads
// Can be used to expose safe APIs to the renderer process if needed

const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to use
// the APIs without exposing the entire Node.js API
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any Electron-specific APIs here if needed in the future
  platform: process.platform,
});

