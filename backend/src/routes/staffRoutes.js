import express from 'express';
import {
  getStaff,
  createStaff,
  updateStaff,
  getCommissionSummary,
  recordCommissionPayment,
  getPaymentHistory,
  getItemizedCommissionLedger
} from '../controllers/staffController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getStaff);
router.post('/', createStaff);
router.put('/:id', updateStaff);

router.get('/commission-summary', getCommissionSummary);
router.get('/commission-items', getItemizedCommissionLedger);
router.post('/payments', recordCommissionPayment);
router.get('/payments', getPaymentHistory);

export default router;
