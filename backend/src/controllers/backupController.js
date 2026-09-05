import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { logAudit } from '../middleware/auditLogger.js';
import { BACKUP_DIR, ensureDir } from '../utils/appPaths.js';
import { ShopSettings } from '../models/ShopSettings.js';

// Resolved per-request (not a static import) so changing the backup folder
// in Settings takes effect on the very next backup — no app restart needed,
// unlike the main database folder which is bound to a spawned mongod process.
const getActiveBackupDir = async () => {
  const settings = await ShopSettings.findOne();
  const chosen = settings?.backupFolderPath?.trim();
  return chosen ? ensureDir(chosen) : ensureDir(BACKUP_DIR);
};

export const listBackups = async (req, res) => {
  try {
    const backupDir = await getActiveBackupDir();
    const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json'));

    const backups = files.map((file) => {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        sizeBytes: stats.size,
        createdAt: stats.birthtime || stats.mtime
      };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, backups, backupDir });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createBackup = async (req, res) => {
  try {
    const backupDir = await getActiveBackupDir();
    const collections = await mongoose.connection.db.collections();
    const backupData = {};

    for (const collection of collections) {
      const name = collection.collectionName;
      const docs = await collection.find({}).toArray();
      backupData[name] = docs;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const filePath = path.join(backupDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');

    await logAudit({
      user: req.user,
      action: 'CREATE_BACKUP',
      module: 'BACKUP',
      details: `Created database snapshot backup file "${filename}" in ${backupDir}`,
      req
    });

    res.json({
      success: true,
      message: `Database backup created successfully: ${filename}`,
      filename
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const restoreBackup = async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ success: false, message: 'Backup filename is required' });
    }

    const backupDir = await getActiveBackupDir();
    const filePath = path.join(backupDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Backup file does not exist' });
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const backupData = JSON.parse(rawData);

    for (const [collectionName, docs] of Object.entries(backupData)) {
      const collection = mongoose.connection.db.collection(collectionName);
      await collection.deleteMany({});
      if (docs && docs.length > 0) {
        await collection.insertMany(docs);
      }
    }

    await logAudit({
      user: req.user,
      action: 'RESTORE_BACKUP',
      module: 'BACKUP',
      details: `Restored database from snapshot file "${filename}"`,
      req
    });

    res.json({ success: true, message: `Database successfully restored from ${filename}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
