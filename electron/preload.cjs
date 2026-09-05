const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, isolated APIs to React renderer process via window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  // App & System info
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  getLocalIP: () => ipcRenderer.invoke('app:get-local-ip'),

  // Printer & Thermal Receipt Utilities. deviceName targets a specific
  // Windows printer (e.g. "RP 3200 Lite" or "LP 46 Lite") — omit to use
  // the OS default printer instead.
  printReceipt: (htmlData, deviceName) => ipcRenderer.invoke('printer:print-receipt', htmlData, deviceName),
  getPrinters: () => ipcRenderer.invoke('printer:get-list'),

  // File System & Backup Utilities
  saveBackupFileDialog: () => ipcRenderer.invoke('dialog:save-backup'),
  openRestoreFileDialog: () => ipcRenderer.invoke('dialog:open-restore'),
  selectFolder: (options) => ipcRenderer.invoke('dialog:select-folder', options),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // Listeners for Menu Events
  onMenuTrigger: (channel, callback) => {
    const validChannels = ['menu:new-sale', 'menu:export-backup', 'menu:print'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  }
});
