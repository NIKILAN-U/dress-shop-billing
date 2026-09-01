import express from 'express';
import { getDashboardStats, getSalesReport, getProfitReport } from '../controllers/reportController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard', protect, getDashboardStats);
router.get('/sales', protect, adminOnly, getSalesReport);
router.get('/profit', protect, adminOnly, getProfitReport);

export default router;
