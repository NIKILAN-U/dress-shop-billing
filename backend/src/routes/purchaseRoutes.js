import express from 'express';
import { getPurchases, getPurchaseById, createPurchase } from '../controllers/purchaseController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getPurchases);
router.get('/:id', protect, getPurchaseById);
router.post('/', protect, adminOnly, createPurchase);

export default router;
