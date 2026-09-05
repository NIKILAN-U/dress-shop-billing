import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * Single source of truth for filesystem locations.
 *
 * The backend runs in two very different shapes:
 *   - dev:      ESM, `node backend/src/server.js`
 *   - packaged: a single esbuild CJS bundle at backend/dist/server.cjs, loaded
 *               by Electron from inside app.asar
 *
 * `import.meta.url` is native in the first and is supplied to the second by the
 * --define/--banner pair in the `build:backend` script, so it is safe in both.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * asar archives are read-only and binaries inside them cannot be spawned.
 * electron-builder mirrors every `asarUnpack` entry into app.asar.unpacked
 * alongside the archive, so rewrite paths that point into the archive itself.
 */
export const unasar = (p) =>
  p.includes('app.asar') && !p.includes('app.asar.unpacked')
    ? p.replace('app.asar', 'app.asar.unpacked')
    : p;

const firstExisting = (candidates) => {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const resolved = unasar(candidate);
    if (fs.existsSync(resolved)) return resolved;
  }
  return null;
};

/**
 * Walk up from a known anchor until we find the directory that holds both the
 * root package.json and the backend/ folder. Anchoring on the module location
 * rather than process.cwd() keeps this correct no matter where the .exe was
 * launched from.
 */
const findAppRoot = () => {
  const fromEnv = process.env.AURA_APP_ROOT && unasar(process.env.AURA_APP_ROOT);
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  for (const anchor of [HERE, process.cwd()]) {
    let dir = unasar(anchor);
    for (let hops = 0; hops < 8; hops++) {
      if (
        fs.existsSync(path.join(dir, 'package.json')) &&
        fs.existsSync(path.join(dir, 'backend'))
      ) {
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  return process.cwd();
};

export const APP_ROOT = findAppRoot();

/**
 * Writable storage. A packaged install lives under Program Files, which is not
 * writable, so Electron hands us app.getPath('userData') via AURA_USER_DATA.
 * In dev we keep using the repo so existing backups stay where they are.
 */
export const USER_DATA_DIR = process.env.AURA_USER_DATA || APP_ROOT;

export const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

export const BACKUP_DIR = path.join(USER_DATA_DIR, 'backups');

// The user can pick a custom database folder on first run (see
// electron/main.cjs); when they do, Electron passes it through this env var.
// Falls back to the ordinary default when unset (dev mode, or the user
// canceled the picker and accepted the default).
export const DB_DATA_DIR = process.env.AURA_DB_DIR || path.join(USER_DATA_DIR, 'db');

export const resolveFrontendDist = () =>
  firstExisting([
    path.join(APP_ROOT, 'frontend', 'dist'),
    process.resourcesPath && path.join(process.resourcesPath, 'app.asar.unpacked', 'frontend', 'dist'),
    process.resourcesPath && path.join(process.resourcesPath, 'app', 'frontend', 'dist'),
    path.join(process.cwd(), 'frontend', 'dist')
  ]) || path.join(APP_ROOT, 'frontend', 'dist');

export const resolveMongodBinary = () =>
  firstExisting([
    path.join(APP_ROOT, 'backend', 'bin', 'mongod.exe'),
    process.resourcesPath && path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'bin', 'mongod.exe'),
    path.join(process.cwd(), 'backend', 'bin', 'mongod.exe')
  ]);
