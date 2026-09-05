import mongoose from 'mongoose';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { DB_DATA_DIR, ensureDir, resolveMongodBinary } from '../utils/appPaths.js';
import { autoSeedIfEmpty } from '../utils/autoSeeder.js';

export let isConnected = false;
// True only once we've actually spawned and connected to our own bundled
// mongod.exe — false if an external/system MongoDB service answered first
// (Step 1). Relocating "the database folder" only means anything for the
// bundled engine; an external service's data lives wherever that service's
// own admin configured it, which this app has no business touching.
export let usingBundledEngine = false;
// A plain function (rather than reading the exported `let` directly) so a
// caller across the esbuild CJS bundle boundary — main.cjs's require() of
// the bundled server — always gets the current value rather than a
// require-time snapshot.
export const isUsingBundledEngine = () => usingBundledEngine;
// Set when the bundled mongod.exe exits before we ever manage to connect to
// it, so /api/health (and the Electron main process, via that endpoint) can
// tell a real "MongoDB just isn't installed on this network path" situation
// apart from "the bundled engine crashed and never came up at all" — the two
// look identical from Express's side (isConnected stays false either way).
export let dbFailureReason = null;
let mongodProcess = null;
let connectionPromise = null;

// The exact byte size of the mongod.exe this app was built and shipped with
// (backend/bin/mongod.exe) — used to detect a corrupted/truncated copy
// before ever trying to run it. Update this if mongod.exe is ever
// intentionally replaced with a different build.
const EXPECTED_MONGOD_SIZE = 85504000;

// The official MongoDB Windows builds require the CPU to support AVX
// (mandatory since MongoDB 5.0) and the MSVC 2015-2022 runtime DLLs. Both
// failures manifest as mongod.exe exiting within a second or two of launch,
// before it ever opens its listening port — this is the single most common
// reason the bundled database silently never comes up on a machine that
// isn't the one it was built/tested on.
const describeMongodExit = (code, signal) => {
  // Windows surfaces STATUS_ILLEGAL_INSTRUCTION (an unsupported CPU
  // instruction, i.e. no AVX) as this NTSTATUS value, which Node reports as
  // the process exit code — sometimes signed, sometimes as its unsigned
  // 32-bit twin depending on Windows version.
  const ILLEGAL_INSTRUCTION = [-1073741795, 3221225501];
  if (ILLEGAL_INSTRUCTION.includes(code)) {
    return 'This PC\'s CPU does not support the AVX instruction set, which MongoDB 5.0+ requires. The bundled database engine cannot run on this hardware.';
  }
  if (code === 3221225781 || code === -1073741515) {
    // STATUS_DLL_NOT_FOUND
    return 'A required system component (Microsoft Visual C++ Redistributable) is missing. Install the "VC++ x64 Redistributable" from Microsoft and restart the app.';
  }
  if (code === 3221225785 || code === -1073741431) {
    // STATUS_ENTRYPOINT_NOT_FOUND — a runtime DLL loaded, but is an older
    // version missing a function mongod.exe needs. Same underlying fix as
    // the missing-DLL case (a correct VC++ Redistributable), so this is
    // worded to match — the app's "install it now" flow keys off that exact
    // phrase.
    return 'A required system component (Microsoft Visual C++ Redistributable) is an incompatible version. Install the "VC++ x64 Redistributable" from Microsoft and restart the app.';
  }
  return `Bundled database engine exited unexpectedly (code ${code}, signal ${signal || 'none'}) before it could be reached.`;
};

// A Windows-loader-level crash (DLL missing or an incompatible version)
// happens before mongod.exe ever runs its own code, so there is nothing in
// our own process to inspect, and — confirmed by testing in the field —
// this specific class of failure does not produce a standard "Application
// Error" Windows event either, so there's no way to ask Windows after the
// fact which DLL was at fault. Windows DOES show this precisely and by
// name, but only when the process is launched interactively (double-clicked
// or run from a console) — not when spawned hidden, as the app normally
// does. Placing a copy of the exact same binary on the Desktop lets someone
// get that exact native dialog with one double-click, which is the most
// direct and reliable way left to identify the real cause.
const copyMongodForManualDiagnosis = (binaryPath) => {
  try {
    const desktopDir = path.join(os.homedir(), 'Desktop');
    // copyFileSync needs the destination directory to already exist — most
    // real user profiles have one, but this shouldn't hard-fail on any
    // profile that doesn't (a redirected/OneDrive-managed Desktop, or a
    // minimal/service profile).
    fs.mkdirSync(desktopDir, { recursive: true });
    const destPath = path.join(desktopDir, 'Debug - Double Click This - AURA POS.exe');
    fs.copyFileSync(binaryPath, destPath);
    return destPath;
  } catch (err) {
    return null;
  }
};

const tryMongooseConnect = async (uri) => {
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000
    });
    isConnected = true;
    dbFailureReason = null;
    console.log(`[MongoDB] Mongoose connected successfully to: ${conn.connection.host}`);
    return true;
  } catch (err) {
    isConnected = false;
    return false;
  }
};

export const connectDB = () => {
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
  const defaultPort = 27017;
  const mongoUri = process.env.MONGODB_URI || `mongodb://127.0.0.1:${defaultPort}/dress_shop`;

  // Step 1: Attempt connecting to existing local MongoDB instance
  const connectedAlready = await tryMongooseConnect(mongoUri);
  if (connectedAlready) {
    return true;
  }

  console.log('[MongoDB] No active MongoDB service found on port 27017. Spawning bundled offline database engine...');

  // Step 2: Locate the bundled mongod.exe binary
  const binaryPath = resolveMongodBinary();

  // Persistent database storage, kept outside the (read-only) install directory
  const dbDataDir = ensureDir(DB_DATA_DIR);

  // A corrupted or truncated mongod.exe (a bad USB transfer, antivirus
  // "sanitizing" the file in place, an interrupted copy) crashes with the
  // exact same generic Windows-loader symptom as a genuinely missing system
  // component — but naming the .exe's own path as the "library" it can't
  // find a function in, rather than a real dependency, is the actual
  // giveaway. Checking the file size up front turns that easy-to-misdiagnose
  // crash into an unambiguous "this file is broken" message.
  const binaryExists = binaryPath && fs.existsSync(binaryPath);
  const binarySizeOk = binaryExists && fs.statSync(binaryPath).size === EXPECTED_MONGOD_SIZE;

  if (binaryExists && !binarySizeOk) {
    const actualSize = fs.statSync(binaryPath).size;
    dbFailureReason = `The bundled database engine file is corrupted or incomplete (expected ${EXPECTED_MONGOD_SIZE.toLocaleString()} bytes, found ${actualSize.toLocaleString()} bytes). This usually happens from a damaged copy — get a completely fresh copy of the app rather than reinstalling over this one.`;
    console.error('[MongoDB]', dbFailureReason);
  } else if (binarySizeOk) {
    console.log(`[MongoDB] Launching bundled database engine: ${binaryPath}`);
    console.log(`[MongoDB] Database storage path: ${dbDataDir}`);

    try {
      mongodProcess = spawn(binaryPath, [
        '--dbpath', dbDataDir,
        '--port', String(defaultPort),
        '--bind_ip', '127.0.0.1'
      ], {
        detached: false,
        windowsHide: true
      });

      mongodProcess.on('error', (err) => {
        dbFailureReason = `Could not launch bundled database engine: ${err.message}`;
        console.error('[MongoDB Process Error]', err.message);
      });

      mongodProcess.on('exit', (code, signal) => {
        if (!isConnected) {
          dbFailureReason = describeMongodExit(code, signal);
          console.error('[MongoDB Process Exit]', dbFailureReason, `(raw code=${code} signal=${signal})`);

          const debugCopyPath = copyMongodForManualDiagnosis(binaryPath);
          if (debugCopyPath) {
            dbFailureReason = `${dbFailureReason} For the exact reason, go to the Desktop and double-click "Debug - Double Click This - AURA POS.exe" — Windows will show a precise error naming the exact missing component.`;
            console.error('[MongoDB Process Exit] Diagnostic copy placed at:', debugCopyPath);
          }
        }
      });

      // Handle graceful process shutdown
      const killMongod = () => {
        if (mongodProcess && !mongodProcess.killed) {
          try {
            mongodProcess.kill('SIGTERM');
          } catch (e) {}
        }
      };

      process.on('exit', killMongod);
      process.on('SIGINT', killMongod);
      process.on('SIGTERM', killMongod);

      // Wait 2.5s for mongod.exe to initialize storage engine
      await new Promise((r) => setTimeout(r, 2500));

      const ok = await tryMongooseConnect(mongoUri);
      if (ok) {
        usingBundledEngine = true;
        console.log('[MongoDB] Bundled offline database engine started and connected successfully!');
        return true;
      }
    } catch (err) {
      console.error('[MongoDB Spawn Error]', err.message);
    }
  } else {
    dbFailureReason = 'Bundled mongod.exe was not found inside the installed app. Reinstalling may fix this.';
    console.warn('[MongoDB Warning] Bundled mongod.exe not found in any known location. Falling back to retrying an external MongoDB service.');
  }

  // Step 3: Retry loop if mongod process takes a moment to initialize
  let attempts = 0;
  while (attempts < 5) {
    await new Promise((r) => setTimeout(r, 2000));
    const ok = await tryMongooseConnect(mongoUri);
    if (ok) return true;
    attempts++;
  }

  if (!dbFailureReason) {
    dbFailureReason = 'Could not reach MongoDB on 127.0.0.1:27017 and the bundled database engine never became reachable.';
  }
  return false;
  })();

  return connectionPromise;
};

// A database created before SKU became optional already has a plain unique
// index on it — that index treats every product missing a SKU as sharing the
// same "no value", so the second such product would fail with a duplicate
// key error. Changing the schema to `sparse: true` doesn't retroactively fix
// an index already sitting in the database; the old one has to be dropped so
// Mongoose's own index sync can recreate it correctly.
let indexRepairPromise = null;

const repairIndexes = async () => {
  if (!indexRepairPromise) {
    indexRepairPromise = (async () => {
      try {
        const collection = mongoose.connection.db.collection('products');
        const existing = await collection.indexes();
        const skuIndex = existing.find((idx) => idx.key && idx.key.sku === 1);
        if (skuIndex && !skuIndex.sparse) {
          await collection.dropIndex(skuIndex.name);
          console.log('[DB Migration] Dropped legacy non-sparse SKU index so SKU can be optional.');
        }
      } catch (err) {
        // No products collection yet, or nothing to fix — not an error.
      }
    })();
  }
  return indexRepairPromise;
};

// Connecting is not the same as being ready to serve requests: on a fresh
// install the database comes up empty, and autoSeedIfEmpty() takes real time
// to insert the default users/catalog. A request (e.g. login) that only waits
// for the connection can land in that window and see "no such user" even
// though the app is about to be fully seeded a moment later. Memoized so the
// seed only ever runs once, and every caller — the startup log line and every
// request handler — awaits the same in-flight promise instead of racing it.
let seedPromise = null;

export const ensureDatabaseReady = async () => {
  const connected = await connectDB();
  if (!connected) return false;

  await repairIndexes();

  if (!seedPromise) {
    seedPromise = autoSeedIfEmpty().catch((err) => {
      console.error('[AutoSeed Error]', err.message);
    });
  }
  await seedPromise;

  return isConnected;
};

// Cleanly stops the bundled mongod.exe before its data files get copied
// elsewhere (e.g. relocating the database folder). Copying WiredTiger's files
// while it is still running and mid-write can produce a corrupted copy at the
// new location — waiting for a clean exit first avoids that entirely. A
// no-op when an external MongoDB service is in use, since there is no
// bundled process to stop.
export const shutdownDatabase = async () => {
  await mongoose.disconnect().catch(() => {});
  isConnected = false;

  if (!mongodProcess || mongodProcess.killed) return;

  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 8000);
    mongodProcess.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    try {
      mongodProcess.kill('SIGTERM');
    } catch (e) {
      clearTimeout(timeout);
      resolve();
    }
  });
};
