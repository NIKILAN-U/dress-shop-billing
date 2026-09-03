import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { logAudit } from '../middleware/auditLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.resolve(__dirname, '../../../backups');

const ensureBackupDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
};

export const listBackups = async (req, res) => {
  try {
    ensureBackupDir();
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json'));

    const backups = files.map((file) => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        sizeBytes: stats.size,
        createdAt: stats.birthtime || stats.mtime
      };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, backups });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createBackup = async (req, res) => {
  try {
    ensureBackupDir();
    const collections = await mongoose.connection.db.collections();
    const backupData = {};

    for (const collection of collections) {
      const name = collection.collectionName;
      const docs = await collection.find({}).toArray();
      backupData[name] = docs;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const filePath = path.join(BACKUP_DIR, filename);

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');

    await logAudit({
      user: req.user,
      action: 'CREATE_BACKUP',
      module: 'BACKUP',
      details: `Created database snapshot backup file "${filename}"`,
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

    ensureBackupDir();
    const filePath = path.join(BACKUP_DIR, filename);
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
