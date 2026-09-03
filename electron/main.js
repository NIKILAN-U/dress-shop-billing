import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let serverStarted = false;

const PORT = process.env.PORT || 5000;
const SERVER_URL = `http://localhost:${PORT}`;

// Helper to wait for Express server readiness
const waitForServer = (url, timeout = 15000) => {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode === 200 || res.statusCode === 304 || res.statusCode === 404) {
            resolve(true);
          } else {
            retry();
          }
        })
        .on('error', () => {
          retry();
        });
    };

    const retry = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error('Express server startup timeout'));
      } else {
        setTimeout(check, 300);
      }
    };

    check();
  });
};

// Start Express Backend Server inside Electron
const startExpressServer = async () => {
  if (serverStarted) return;
  process.env.NODE_ENV = 'production';
  
  try {
    const serverPath = path.join(__dirname, '../backend/src/server.js');
    await import(`file://${serverPath}`);
    serverStarted = true;
    console.log('[Electron Main] Express backend initialized successfully');
  } catch (err) {
    console.error('[Electron Main] Failed to start Express server:', err);
  }
};

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'AURA TEXTILES — POS Billing & Inventory Software',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow.maximize();

  // Open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  try {
    await waitForServer(SERVER_URL);
    await mainWindow.loadURL(SERVER_URL);
    mainWindow.show();
  } catch (err) {
    console.error('[Electron Main] Error loading application URL:', err);
    await mainWindow.loadURL(SERVER_URL);
    mainWindow.show();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(async () => {
  await startExpressServer();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
