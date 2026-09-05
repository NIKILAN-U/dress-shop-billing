import express from 'express';
import {
  getBarcodeCatalog,
  getNextBarcodes,
  generateVariantBarcode,
  bulkGenerateBarcodes,
  logBarcodePrint,
  getBarcodePrintLogs
} from '../controllers/barcodeController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/catalog', getBarcodeCatalog);
router.get('/next', getNextBarcodes);
router.post('/generate', adminOnly, generateVariantBarcode);
router.post('/bulk-generate', adminOnly, bulkGenerateBarcodes);
router.post('/log-print', adminOnly, logBarcodePrint);
router.get('/print-history', adminOnly, getBarcodePrintLogs);

export default router;
