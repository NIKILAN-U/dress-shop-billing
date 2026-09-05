const { app, BrowserWindow, shell, protocol, net, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const { setupIPCHandlers } = require('./ipcHandlers.cjs');
const { buildApplicationMenu } = require('./menu.cjs');

let mainWindow = null;
let serverStarted = false;
let serverModule = null;
let activeServerUrl = null;

// --- Diagnostics -----------------------------------------------------------
// A blank window on a machine we can't get our hands on is undiagnosable
// without this: everything logged here also lands in a file under the user's
// AppData so it can be pulled off a client PC after the fact.
const logFile = app.isPackaged
  ? path.join(app.getPath('userData'), 'logs', 'main.log')
  : null;

const writeLog = (level, args) => {
  const line = `[${new Date().toISOString()}] [${level}] ${args.map(String).join(' ')}\n`;
  if (logFile) {
    try {
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
      fs.appendFileSync(logFile, line);
    } catch (e) {
      // Nothing useful to do if even the log can't be written.
    }
  }
};

const origLog = console.log.bind(console);
const origError = console.error.bind(console);
console.log = (...args) => { origLog(...args); writeLog('INFO', args); };
console.error = (...args) => { origError(...args); writeLog('ERROR', args); };

process.on('uncaughtException', (err) => {
  console.error('[Electron Main] Uncaught exception:', err.stack || err.message);
});

// Disable GPU acceleration issues on target PCs
app.disableHardwareAcceleration();

// --- Database folder selection ----------------------------------------------
// Persisted separately from the database itself (which the backend owns) so
// this survives even if the chosen folder is later moved or emptied.
const configFilePath = () => path.join(app.getPath('userData'), 'app-config.json');

const readAppConfig = () => {
  try {
    return JSON.parse(fs.readFileSync(configFilePath(), 'utf8'));
  } catch (e) {
    return {};
  }
};

const writeAppConfig = (partial) => {
  const merged = { ...readAppConfig(), ...partial };
  try {
    fs.mkdirSync(path.dirname(configFilePath()), { recursive: true });
    fs.writeFileSync(configFilePath(), JSON.stringify(merged, null, 2));
  } catch (e) {
    console.error('[Electron Main] Failed to save app config:', e.message);
  }
  return merged;
};

const defaultDbDir = () => path.join(app.getPath('userData'), 'db');

// A real MongoDB data directory always contains a WiredTiger control file —
// this is how we tell "genuinely empty/new folder" apart from "this already
// holds real invoices, bills and product data from before this folder-choice
// feature existed". Getting this wrong means silently starting a brand new,
// empty database while a shop's real sales history sits untouched right next
// to it — it isn't deleted, but the app would look empty until someone
// figured out where the old folder was.
const dirHasExistingDatabase = (dir) => {
  try {
    return fs.existsSync(path.join(dir, 'WiredTiger'));
  } catch (e) {
    return false;
  }
};

const promptForDbFolder = async ({ isFirstRun }) => {
  const result = await dialog.showOpenDialog({
    title: isFirstRun
      ? 'Choose a Folder to Store the AURA TEXTILES POS Database'
      : 'Choose a New Database Folder',
    message: isFirstRun
      ? 'Select a folder where AURA TEXTILES POS will store its database files (invoices, bills, and product lists). Click Cancel to use the default location instead.\n\n(This only applies if no other MongoDB service is already running on this PC — if one is, the app will use that instead.)'
      : 'Select a new folder. Your existing invoices, bills, and product lists will be copied there automatically before the app switches over — nothing is left behind.',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Use This Folder'
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
};

// Copies every file from the current database folder into the newly chosen
// one, so relocating storage actually takes the shop's real data with it
// instead of silently starting over empty.
const copyDbFolderContents = (fromDir, toDir) => {
  fs.mkdirSync(toDir, { recursive: true });
  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    const src = path.join(fromDir, entry.name);
    const dest = path.join(toDir, entry.name);
    if (entry.isDirectory()) {
      fs.cpSync(src, dest, { recursive: true });
    } else {
      fs.copyFileSync(src, dest);
    }
  }
};

// Lets the user relocate the database after the first run, via File menu.
// Actually moves the existing data rather than just repointing to an empty
// folder — a "move" that quietly leaves a shop's real sales history behind
// is not what anyone asking to relocate their database wants.
const changeDbFolder = async () => {
  // An external/system MongoDB service (rather than our bundled engine)
  // keeps its data wherever that service's own admin put it — we have no
  // business copying files we don't know the location of, and doing so
  // would not even change where that service actually reads from.
  if (serverModule && !serverModule.isUsingBundledEngine()) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Change Database Folder',
      message: 'This PC is currently using a separately installed MongoDB service, not the app\'s built-in database engine.',
      detail: 'Relocating storage only applies to the built-in engine. To move this database, use MongoDB\'s own configuration instead.',
      buttons: ['OK']
    });
    return;
  }

  const currentDbDir = readAppConfig().dbDir || defaultDbDir();
  const hasData = dirHasExistingDatabase(currentDbDir);

  const confirm = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Change Database Folder',
    message: hasData
      ? 'Your existing invoices, bills, and product lists will be copied to the new folder before switching over.'
      : 'Choose a new folder for the database.',
    detail: 'The app will restart after you pick a folder.',
    buttons: ['Cancel', 'Choose Folder…'],
    defaultId: 0,
    cancelId: 0
  });
  if (confirm.response !== 1) return;

  const chosen = await promptForDbFolder({ isFirstRun: false });
  if (!chosen) return;

  if (hasData) {
    try {
      // Stop the engine first — copying WiredTiger's files while it is still
      // running and mid-write can produce a corrupted copy.
      if (serverModule) await serverModule.shutdownDatabase();
      copyDbFolderContents(currentDbDir, chosen);
    } catch (err) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Could Not Move Database',
        message: 'Copying your existing data to the new folder failed, so nothing has been changed.',
        detail: err.message,
        buttons: ['OK']
      });
      return;
    }
  }

  writeAppConfig({ dbDir: chosen });
  app.relaunch();
  app.exit(0);
};

// Resolve the built frontend directory the same way regardless of whether the
// app is running from source or from inside app.asar.unpacked.
const resolveFrontendDistDir = () => {
  const candidates = [
    path.join(__dirname, '../frontend/dist'),
    path.join(__dirname, '../frontend/dist').replace('app.asar', 'app.asar.unpacked'),
    process.resourcesPath && path.join(process.resourcesPath, 'app.asar.unpacked', 'frontend', 'dist')
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
};

// The single most common reason the bundled database engine never starts on
// a machine other than the one it was built on: mongod.exe needs the
// Microsoft Visual C++ 2015-2022 x64 runtime, which a fresh Windows install
// does not necessarily have. Bundled here (Microsoft's own, genuine,
// digitally-signed redistributable) so the shop never has to go find and
// install it themselves — the app can just do it.
const resolveVcRedistInstaller = () => {
  const candidates = [
    path.join(__dirname, '../backend/bin/vc_redist.x64.exe'),
    path.join(__dirname, '../backend/bin/vc_redist.x64.exe').replace('app.asar', 'app.asar.unpacked'),
    process.resourcesPath && path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'bin', 'vc_redist.x64.exe')
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
};

// Installing this needs Administrator rights, which the app itself does not
// run with. Spawning the installer directly is unreliable for that: Windows
// still shows its own separate UAC consent prompt (since the installer's own
// manifest demands elevation), but a plain child_process.spawn does not
// reliably track the *elevated* process once Windows' elevation broker gets
// involved — the 'exit' event can fire early/wrong, silently reporting
// "success" before the real install even ran. Routing through PowerShell's
// Start-Process -Verb RunAs -Wait is the standard, reliable way to trigger
// that same UAC prompt from a non-elevated app and actually wait for the
// elevated process's real exit code. 1602 (a real Windows Installer code,
// reused here for a recognizable signal) means the user closed or declined
// that Windows permission prompt — not a real install failure.
const runVcRedistInstaller = (installerPath) => {
  return new Promise((resolve, reject) => {
    const psScript =
      `try { ` +
      `$p = Start-Process -FilePath '${installerPath}' -ArgumentList '/install','/quiet','/norestart' -Verb RunAs -Wait -PassThru; ` +
      `exit $p.ExitCode ` +
      `} catch { exit 1602 }`;
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], { windowsHide: true });
    child.on('error', reject);
    child.on('exit', (code) => resolve(code));
  });
};

// Copies the bundled installer to the Desktop so it can be run manually via
// Windows' own familiar right-click "Run as Administrator" — a fallback that
// does not depend on our own elevation-triggering code working on every
// machine (which, in the field, has proven less reliable than a plain,
// native OS action the person is already used to).
const copyInstallerToDesktop = (installerPath) => {
  try {
    const desktopDir = app.getPath('desktop');
    // copyFileSync needs the destination directory to already exist — most
    // real profiles have one, but this shouldn't hard-fail on any that
    // don't (a redirected/OneDrive-managed Desktop, or a minimal profile).
    fs.mkdirSync(desktopDir, { recursive: true });
    const destPath = path.join(desktopDir, 'Install This First - AURA POS.exe');
    fs.copyFileSync(installerPath, destPath);
    return destPath;
  } catch (err) {
    console.error('[Electron Main] Could not copy installer to Desktop:', err.message);
    return null;
  }
};

const offerToInstallVcRedist = async () => {
  const installerPath = resolveVcRedistInstaller();
  if (!installerPath) {
    console.error('[Electron Main] VC++ Redistributable installer not found in the package.');
    return false;
  }

  const desktopCopy = copyInstallerToDesktop(installerPath);
  const manualHint = desktopCopy
    ? `\n\nIf that doesn't work, a copy has been placed on the Desktop as "Install This First - AURA POS.exe" — right-click it and choose "Run as administrator", then reopen this app.`
    : '';

  const choice = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Missing Windows Component',
    message: 'This PC is missing a Microsoft system component the database engine needs.',
    detail: `AURA TEXTILES POS can install it now — it is a genuine Microsoft download bundled with the app, takes under a minute, and needs no internet connection.\n\nWindows will show its own blue permission prompt next ("Do you want to allow this app to make changes?") — click Yes on that one too; that step is Windows asking, not this app. The app will then restart automatically.${manualHint}`,
    buttons: ['Not Now', 'Install Now'],
    defaultId: 1,
    cancelId: 0
  });
  if (choice.response !== 1) return false;

  try {
    console.log('[Electron Main] Running bundled VC++ Redistributable installer...');
    const exitCode = await runVcRedistInstaller(installerPath);
    console.log('[Electron Main] VC++ Redistributable installer exited with code', exitCode);

    // 3010 = installed, but Windows wants a reboot to finish. 1638 = a
    // version of this redistributable is already present — not a failure,
    // just nothing new to do; restarting the app is still worth trying since
    // the earlier failure may have been transient or since fixed.
    if (exitCode === 0 || exitCode === 3010 || exitCode === 1638) {
      await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Component Installed',
        message:
          exitCode === 3010
            ? 'Installed successfully. Windows needs a restart to finish — please restart this PC, then reopen the app.'
            : 'Restarting the app now to finish setting up the database…',
        buttons: ['OK']
      });
      if (exitCode !== 3010) {
        app.relaunch();
        app.exit(0);
      }
      return true;
    }

    if (exitCode === 1602) {
      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Permission Not Granted',
        message: 'The Windows permission prompt was closed or declined, so nothing was installed.',
        detail: desktopCopy
          ? `On the Desktop there is a file named "Install This First - AURA POS.exe" — right-click it, choose "Run as administrator", approve the Windows prompt, then reopen this app.`
          : 'Try again via the File menu ("Fix Database Connection…") and click "Yes" on the blue Windows prompt when it appears.',
        buttons: ['OK']
      });
      return false;
    }

    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Install Failed',
      message: `The installer exited with an unexpected code (${exitCode}).`,
      detail: desktopCopy
        ? `Try running it manually instead: on the Desktop, right-click "Install This First - AURA POS.exe" and choose "Run as administrator", then reopen this app.`
        : 'You can install it manually instead: search "vc_redist.x64.exe" from Microsoft and run it, then reopen this app.',
      buttons: ['OK']
    });
  } catch (err) {
    console.error('[Electron Main] Failed to run VC++ Redistributable installer:', err.message);
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Install Failed',
      message: 'Could not run the installer.',
      detail: desktopCopy
        ? `${err.message}\n\nTry running it manually instead: on the Desktop, right-click "Install This First - AURA POS.exe" and choose "Run as administrator".`
        : err.message,
      buttons: ['OK']
    });
  }
  return false;
};

// File menu > "Fix Database Connection…" — a manual retry for anyone who
// missed or accidentally dismissed the Windows permission prompt the first
// time around, without needing to restart the whole app and hope the
// automatic post-load check fires again.
const onFixDatabase = async () => {
  const baseUrl = activeServerUrl || 'http://127.0.0.1:5000';
  const health = await fetchJson(`${baseUrl}/api/health`);

  if (!health) {
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Fix Database Connection',
      message: 'Could not reach the app\'s own backend server to check status.',
      buttons: ['OK']
    });
    return;
  }

  if (health.database === 'connected') {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Fix Database Connection',
      message: 'The database is already connected — nothing to fix.',
      buttons: ['OK']
    });
    return;
  }

  const reason = health.databaseFailureReason || '';
  if (reason.includes('Visual C++ Redistributable')) {
    await offerToInstallVcRedist();
    return;
  }

  dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Fix Database Connection',
    message: 'The database is not connected.',
    detail: `${reason || 'Unknown reason — see logs.'}\n\nA log file is saved at:\n${logFile || '(dev mode — see terminal)'}`,
    buttons: ['OK']
  });
};

// Serves the built SPA directly off disk for the rare case the local Express
// backend never comes up. Registered as a privileged custom scheme (rather
// than loadFile) because the Vite build emits root-absolute asset paths
// (e.g. src="/assets/x.js") — those resolve fine over http://, but resolve to
// nothing under a bare file:// page, which is what previously produced a
// blank white window with no error of any kind.
protocol.registerSchemesAsPrivileged([
  { scheme: 'aurapos', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);

const registerOfflineProtocol = () => {
  const distDir = resolveFrontendDistDir();
  protocol.handle('aurapos', (request) => {
    const { pathname } = new URL(request.url);
    let filePath = path.join(distDir, decodeURIComponent(pathname));
    // Any path that isn't a real built asset is a client-side route — hand
    // it the SPA shell, same as the Express catch-all does.
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
};

const LOADING_SPLASH_HTML = `data:text/html;charset=utf-8,${encodeURIComponent(`
<!doctype html><html><head><meta charset="utf-8"><title>Loading</title>
<style>
  html,body{height:100%;margin:0;background:#0f172a;color:#e2e8f0;font-family:Segoe UI,Arial,sans-serif;
    display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px}
  .spinner{width:36px;height:36px;border:4px solid #334155;border-top-color:#f59e0b;border-radius:50%;
    animation:spin 0.9s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  p{font-size:13px;letter-spacing:.05em;opacity:.85}
</style></head>
<body><div class="spinner"></div><p>STARTING AURA TEXTILES POS…</p></body></html>
`)}`;

// Helper to check if a specific server URL is active
const checkServerUrl = (url) => {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      // Drain the body so the socket is released instead of being held open
      // for the duration of the polling loop.
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
};

const fetchJson = (url) => {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(3000, () => { req.destroy(); resolve(null); });
  });
};

// Express starting successfully (the case waitForAnyServer confirms) does not
// mean the database came up — the two are intentionally decoupled so the app
// can still show a UI when the bundled mongod.exe fails. That state is
// invisible to anyone just looking at the window, so surface it directly
// rather than leaving cashiers staring at silently-failing API calls.
const checkDatabaseHealthAndWarn = async (baseUrl) => {
  await new Promise((r) => setTimeout(r, 4000));
  const health = await fetchJson(`${baseUrl}/api/health`);
  if (!health) {
    console.error('[Electron Main] Post-load health check got no response from', baseUrl);
    return;
  }
  if (health.database !== 'connected') {
    const reason = health.databaseFailureReason || 'Unknown reason — see logs.';
    console.error('[Electron Main] Database did not connect:', reason);

    if (reason.includes('Visual C++ Redistributable')) {
      const handled = await offerToInstallVcRedist();
      if (handled) return;
    }

    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Database Not Connected',
      message: 'AURA TEXTILES POS started, but the database is not available.',
      detail: `${reason}\n\nThe app will run with limited functionality until this is resolved. A log file is saved at:\n${logFile || '(dev mode — see terminal)'}`,
      buttons: ['OK']
    });
  }
};

// Ports the backend may fall back to; must stay in sync with the retry range
// in backend/src/server.js or the window will never find a running server.
const SERVER_PORTS = [5000, 5001, 5002, 5003, 5004];

// Scan multiple candidate ports for Express backend startup. 45s (not the
// original 20s) because a fresh machine may spend a lot of that scanning the
// freshly-extracted mongod.exe/electron binaries with real-time antivirus
// before the process is even allowed to run.
const waitForAnyServer = async (ports = SERVER_PORTS, timeout = 45000) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    for (const p of ports) {
      const url = `http://127.0.0.1:${p}`;
      const healthActive = await checkServerUrl(`${url}/api/health`);
      if (healthActive) return url;
      const rootActive = await checkServerUrl(url);
      if (rootActive) return url;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return `http://127.0.0.1:${ports[0]}`;
};

// Start Express Backend Server inside Electron cleanly
const startExpressServer = async () => {
  if (serverStarted) return;
  process.env.NODE_ENV = 'production';

  // Anchor the backend's path resolution. It cannot derive these itself once it
  // is a bundle inside app.asar, and process.cwd() is wherever the shortcut
  // happened to launch from.
  process.env.AURA_APP_ROOT = app.getAppPath().replace('app.asar', 'app.asar.unpacked');

  // A packaged install lives under Program Files and is not writable, so the
  // database and backups have to go to the per-user data directory.
  if (app.isPackaged) {
    process.env.AURA_USER_DATA = app.getPath('userData');
  }

  // Database storage location: ask once on first run, then remember it. A
  // cancel just falls back to the ordinary default under userData\db.
  //
  // Critical: this feature did not always exist. Anyone upgrading from an
  // earlier build already has real invoices/bills sitting at the old default
  // location with no app-config.json recorded at all — to that install this
  // looks identical to a genuine first run. Prompting anyway risks the user
  // picking a different folder and the app quietly starting a brand new,
  // empty database while their real sales history sits untouched right next
  // to it. So: if the default location already holds a real database, adopt
  // it silently and never ask.
  const config = readAppConfig();
  let dbDir = config.dbDir;
  if (!dbDir) {
    if (dirHasExistingDatabase(defaultDbDir())) {
      dbDir = defaultDbDir();
      console.log('[Electron Main] Existing database found at the default location from before this folder-choice feature existed — using it, not prompting.');
    } else {
      const chosen = await promptForDbFolder({ isFirstRun: true });
      dbDir = chosen || defaultDbDir();
    }
    writeAppConfig({ dbDir });
  }
  process.env.AURA_DB_DIR = dbDir;
  console.log('[Electron Main] Database folder:', dbDir);

  try {
    const candidateServerPaths = [
      path.join(__dirname, '../backend/dist/server.cjs'),
      path.join(__dirname, '../backend/dist/server.cjs').replace('app.asar', 'app.asar.unpacked'),
      path.join(process.cwd(), 'resources', 'app.asar.unpacked', 'backend', 'dist', 'server.cjs'),
      ...(process.resourcesPath ? [path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'dist', 'server.cjs')] : [])
    ];

    let serverPath = candidateServerPaths.find(p => {
      let checkP = p;
      if (checkP.includes('app.asar') && !checkP.includes('app.asar.unpacked')) {
        checkP = checkP.replace('app.asar', 'app.asar.unpacked');
      }
      return fs.existsSync(checkP);
    });

    if (serverPath && serverPath.includes('app.asar') && !serverPath.includes('app.asar.unpacked')) {
      serverPath = serverPath.replace('app.asar', 'app.asar.unpacked');
    }

    if (!serverPath || !fs.existsSync(serverPath)) {
      console.error(
        '[Electron Main Error] Backend server.cjs not found. Checked:',
        candidateServerPaths.join(' | '),
        'resourcesPath:', process.resourcesPath
      );
      return;
    }

    console.log('[Electron Main] Express backend path resolved to:', serverPath);
    serverModule = require(serverPath);
    serverStarted = true;
    console.log('[Electron Main] Express backend initialized successfully from:', serverPath);
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
    autoHideMenuBar: false,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.cjs')
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

  // Show something immediately — otherwise the window is a genuinely blank
  // OS surface for however long the backend takes to come up, which reads
  // exactly like a crash even when startup is just slow.
  await mainWindow.loadURL(LOADING_SPLASH_HTML);

  try {
    const activeUrl = await waitForAnyServer(SERVER_PORTS);
    activeServerUrl = activeUrl;
    console.log('[Electron Main] Loading application from:', activeUrl);
    await mainWindow.loadURL(activeUrl);
    checkDatabaseHealthAndWarn(activeUrl);
  } catch (err) {
    console.error('[Electron Main] Backend never became reachable, loading offline shell:', err.message || err);
    await mainWindow.loadURL('aurapos://app/index.html');
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Backend Did Not Start',
      message: 'AURA TEXTILES POS could not start its background server.',
      detail: `The app is running in a limited offline mode. Login and data features will not work.\n\nA log file with details is saved at:\n${logFile || '(dev mode — see terminal)'}`,
      buttons: ['OK']
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(async () => {
  console.log('[Electron Main] App ready. Version:', app.getVersion(), 'Packaged:', app.isPackaged);
  registerOfflineProtocol();
  setupIPCHandlers();
  buildApplicationMenu({ onChangeDbFolder: changeDbFolder, onFixDatabase });
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
