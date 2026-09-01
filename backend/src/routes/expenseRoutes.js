import express from 'express';
import { getExpenses, createExpense, deleteExpense } from '../controllers/expenseController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getExpenses);
router.post('/', protect, adminOnly, createExpense);
router.delete('/:id', protect, adminOnly, deleteExpense);

export default router;
