import express from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer
} from '../controllers/customerController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getCustomers);
router.get('/:id', protect, getCustomerById);
router.post('/', protect, createCustomer);
router.put('/:id', protect, updateCustomer);

export default router;
