import express from 'express';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  getSupplierHistory
} from '../controllers/supplierController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getSuppliers);
router.post('/', protect, adminOnly, createSupplier);
router.put('/:id', protect, adminOnly, updateSupplier);
router.get('/:id/history', protect, adminOnly, getSupplierHistory);

export default router;
