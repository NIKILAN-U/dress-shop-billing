import express from 'express';
import { listBackups, createBackup, restoreBackup } from '../controllers/backupController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, adminOnly);

router.get('/', listBackups);
router.post('/create', createBackup);
router.post('/restore', restoreBackup);

export default router;
