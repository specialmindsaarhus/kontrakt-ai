const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // ========== Settings ==========
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // ========== CLI Provider Detection ==========
  detectCLIProviders: () => ipcRenderer.invoke('cli:detect-providers'),

  // ========== Prompts ==========
  getAvailablePrompts: () => ipcRenderer.invoke('prompts:get-available'),

  // ========== Analysis ==========
  runAnalysis: (params) => ipcRenderer.invoke('analysis:run', params),
  cancelAnalysis: () => ipcRenderer.invoke('analysis:cancel'),

  // Analysis progress events (main -> renderer)
  onAnalysisProgress: (callback) => {
    const subscription = (event, progress) => callback(progress);
    ipcRenderer.on('analysis:progress', subscription);
    return subscription;
  },

  removeAnalysisProgressListener: (callback) => {
    if (callback) {
      ipcRenderer.removeListener('analysis:progress', callback);
    } else {
      ipcRenderer.removeAllListeners('analysis:progress');
    }
  },

  // ========== File Operations ==========
  openFile: (filePath) => ipcRenderer.invoke('file:open', filePath),
  openDirectory: (dirPath) => ipcRenderer.invoke('file:open-directory', dirPath),
  openPath: (path) => ipcRenderer.invoke('file:open-path', path),
  selectFile: (filters) => ipcRenderer.invoke('dialog:select-file', filters),
  loadLogo: (logoPath) => ipcRenderer.invoke('logo:load', logoPath),

  // ========== Export ==========
  exportReport: (params) => ipcRenderer.invoke('export:report', params),

  // ========== Error Handling ==========
  onError: (callback) => {
    const subscription = (event, error) => callback(error);
    ipcRenderer.on('app:error', subscription);
    return subscription;
  },

  removeErrorListener: (callback) => {
    if (callback) {
      ipcRenderer.removeListener('app:error', callback);
    } else {
      ipcRenderer.removeAllListeners('app:error');
    }
  }
});
