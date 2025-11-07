const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Check if Chroma server is running
  checkChromaStatus: () => ipcRenderer.invoke('check-chroma-status'),

  // Restart Chroma server
  restartChroma: () => ipcRenderer.invoke('restart-chroma'),

  // Listen for Chroma errors
  onChromaError: (callback) => {
    ipcRenderer.on('chroma-error', (event, message) => callback(message));
  },
});
