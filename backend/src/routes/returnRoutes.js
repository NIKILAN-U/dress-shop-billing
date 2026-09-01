import express from 'express';
import { getReturns, createReturn } from '../controllers/returnController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getReturns);
router.post('/', protect, createReturn);

export default router;
