const { Menu, app, shell, BrowserWindow } = require('electron');

function buildApplicationMenu(callbacks = {}) {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
          ]
        }]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Billing Sale',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            const focusedWin = BrowserWindow.getFocusedWindow();
            if (focusedWin) focusedWin.webContents.send('menu:new-sale');
          }
        },
        {
          label: 'Print Thermal Invoice',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            const focusedWin = BrowserWindow.getFocusedWindow();
            if (focusedWin) focusedWin.webContents.print();
          }
        },
        { type: 'separator' },
        {
          label: 'Change Database Folder…',
          click: () => callbacks.onChangeDbFolder && callbacks.onChangeDbFolder()
        },
        {
          label: 'Fix Database Connection…',
          click: () => callbacks.onFixDatabase && callbacks.onFixDatabase()
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' }
            ]
          : [{ role: 'close' }])
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'AURA TEXTILES POS Documentation',
          click: async () => {
            await shell.openExternal('http://localhost:5000/api/health');
          }
        },
        { type: 'separator' },
        {
          label: `About ${app.name}`,
          click: () => {
            const focusedWin = BrowserWindow.getFocusedWindow();
            if (focusedWin) {
              focusedWin.webContents.executeJavaScript(
                `alert("AURA TEXTILES — POS Billing & Inventory Software\\nVersion: ${app.getVersion()}\\nBuilt for Windows Desktop");`
              );
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = { buildApplicationMenu };
