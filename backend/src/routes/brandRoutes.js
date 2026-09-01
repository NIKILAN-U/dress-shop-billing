import express from 'express';
import { getBrands, createBrand, updateBrand, deleteBrand } from '../controllers/brandController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getBrands);
router.post('/', protect, adminOnly, createBrand);
router.put('/:id', protect, adminOnly, updateBrand);
router.delete('/:id', protect, adminOnly, deleteBrand);

export default router;
