import express from 'express';
import { getStockSummary, getStockTransactions, adjustStock } from '../controllers/inventoryController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/summary', protect, getStockSummary);
router.get('/transactions', protect, getStockTransactions);
router.post('/adjust', protect, adminOnly, adjustStock);

export default router;
