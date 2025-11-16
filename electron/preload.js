const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Check if server is running
  checkServerStatus: () => ipcRenderer.invoke('check-server-status'),

  // Check if dependencies are installed
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),

  // Restart server
  restartServer: () => ipcRenderer.invoke('restart-server'),

  // Listen for server errors
  onServerError: (callback) => {
    ipcRenderer.on('server-error', (event, message) => callback(message));
  },

  // Listen for dependency issues
  onDependencyIssues: (callback) => {
    ipcRenderer.on('dependency-issues', (event, issues) => callback(issues));
  },

  // Listen for critical startup errors
  onCriticalStartupError: (callback) => {
    ipcRenderer.on('critical-startup-error', (event, data) => callback(data));
  },
});
