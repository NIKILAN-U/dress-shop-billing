const { ipcMain, dialog, app, BrowserWindow } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs');

function setupIPCHandlers() {
  // App Version
  ipcMain.handle('app:get-version', () => {
    return app.getVersion();
  });

  // Get Local Network IP Address (for multi-device POS setup over LAN)
  ipcMain.handle('app:get-local-ip', () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  });

  // Get available printers
  ipcMain.handle('printer:get-list', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return [];
    return await win.webContents.getPrintersAsync();
  });

  // Silent Thermal Printing (receipts and barcode labels both go through
  // this). `deviceName` targets a specific Windows printer by name — pass ''
  // (or omit) to use whatever the OS default printer is instead. This lets
  // receipts and labels go to two different physical printers even though
  // only one of them can ever be the single OS "default".
  ipcMain.handle('printer:print-receipt', async (event, htmlContent, deviceName = '') => {
    const printWin = new BrowserWindow({
      // Positioned off-screen rather than show:false — a window that has
      // never actually been shown does not always get a real paint cycle on
      // Windows, which some print pipelines depend on.
      show: true,
      x: -32000,
      y: -32000,
      width: 400,
      height: 600,
      frame: false,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // A data: URL has an opaque origin, which some Electron/Chromium builds
    // do not handle well in the print pipeline. A real file:// URL avoids
    // that whole class of problem.
    const tempHtmlPath = path.join(os.tmpdir(), `aura-print-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
    try {
      fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');
      await printWin.loadFile(tempHtmlPath);

      // A misconfigured, offline, or (in some environments) purely
      // driver-incompatible printer can leave this waiting forever with no
      // error — this call site falls back to the interactive print dialog on
      // any failure, but only once this actually gives up.
      const printResult = new Promise((resolve) => {
        try {
          printWin.webContents.print(
            { silent: true, printBackground: true, deviceName: deviceName || '' },
            (success, failureReason) => {
              if (!success) console.error('[Printer]', deviceName || '(default)', '->', failureReason);
              resolve({ success, failureReason });
            }
          );
        } catch (syncErr) {
          resolve({ success: false, failureReason: syncErr.message });
        }
      });
      const timeout = new Promise((resolve) =>
        setTimeout(() => resolve({ success: false, failureReason: 'Print job timed out — check the printer is on, connected, and has paper.' }), 8000)
      );

      return await Promise.race([printResult, timeout]);
    } catch (err) {
      return { success: false, failureReason: err.message };
    } finally {
      printWin.destroy();
      try { fs.unlinkSync(tempHtmlPath); } catch (e) {}
    }
  });

  // Save Backup File Dialog
  ipcMain.handle('dialog:save-backup', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const { filePath } = await dialog.showSaveDialog(win, {
      title: 'Export AURA POS Database Backup',
      defaultPath: path.join(app.getPath('documents'), `aura_pos_backup_${Date.now()}.json`),
      filters: [{ name: 'JSON Backup Files', extensions: ['json'] }]
    });
    return filePath;
  });

  // Open Restore File Dialog
  ipcMain.handle('dialog:open-restore', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const { filePaths } = await dialog.showOpenDialog(win, {
      title: 'Select AURA POS Database Backup File',
      properties: ['openFile'],
      filters: [{ name: 'JSON Backup Files', extensions: ['json'] }]
    });
    return filePaths && filePaths.length > 0 ? filePaths[0] : null;
  });

  // Generic folder picker — used for choosing where backups are saved (e.g.
  // an external drive), so the shop isn't stuck with wherever the app
  // defaults to.
  ipcMain.handle('dialog:select-folder', async (event, options = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const { filePaths } = await dialog.showOpenDialog(win, {
      title: options.title || 'Select a Folder',
      message: options.message || '',
      properties: ['openDirectory', 'createDirectory']
    });
    return filePaths && filePaths.length > 0 ? filePaths[0] : null;
  });

  // Window Controls
  ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
  });

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    }
  });

  ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });
}

module.exports = { setupIPCHandlers };
