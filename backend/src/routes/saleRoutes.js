import express from 'express';
import { getSales, getSaleById, createSale, cancelSale } from '../controllers/saleController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getSales);
router.get('/:id', protect, getSaleById);
router.post('/', protect, createSale);
router.put('/:id/cancel', protect, adminOnly, cancelSale);

export default router;
