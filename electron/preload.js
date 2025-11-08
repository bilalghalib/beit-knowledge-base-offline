const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Check if server is running
  checkServerStatus: () => ipcRenderer.invoke('check-server-status'),

  // Restart server
  restartServer: () => ipcRenderer.invoke('restart-server'),

  // Listen for server errors
  onServerError: (callback) => {
    ipcRenderer.on('server-error', (event, message) => callback(message));
  },
});
