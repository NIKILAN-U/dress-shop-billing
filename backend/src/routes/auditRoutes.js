import express from 'express';
import { getAuditLogs } from '../controllers/auditLogController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, adminOnly, getAuditLogs);

export default router;
