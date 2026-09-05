import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { ensureDatabaseReady, isConnected, dbFailureReason, shutdownDatabase, isUsingBundledEngine } from './config/db.js';
import { APP_ROOT, resolveFrontendDist } from './utils/appPaths.js';
import { errorHandler } from './middleware/errorMiddleware.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import brandRoutes from './routes/brandRoutes.js';
import productRoutes from './routes/productRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import returnRoutes from './routes/returnRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import barcodeRoutes from './routes/barcodeRoutes.js';

// The .env lives with the backend, not at whatever directory the app was
// launched from, so point dotenv at it explicitly.
dotenv.config({ path: path.join(APP_ROOT, 'backend', '.env') });

const app = express();

// Warm the connect+seed pipeline immediately at boot. This is the same
// memoized promise every request handler awaits via ensureDatabaseReady(), so
// a request arriving before this resolves waits on this exact in-flight work
// rather than racing it — it does not run the work twice.
ensureDatabaseReady()
  .then((ready) => {
    if (!ready) {
      console.error('[Startup] Database unavailable — API will serve errors until MongoDB is reachable.');
    }
  })
  .catch((err) => {
    console.error('[Startup Error] Database initialization failed:', err.message);
  });

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health & Diagnostic Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'running',
    database: isConnected ? 'connected' : 'disconnected',
    databaseFailureReason: isConnected ? null : dbFailureReason,
    mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dress_shop'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/barcodes', barcodeRoutes);

// Serve Frontend Static Production Assets in production
const frontendDist = resolveFrontendDist();

console.log('[Express Server] Serving static frontend dist from:', frontendDist);
app.use(express.static(frontendDist));

app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(frontendDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(500).send(`AURA TEXTILES POS Server Error: Unable to find index.html at ${indexPath}`);
    }
  });
});

// Central Error Handler
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;

// Electron scans SERVER_PORTS in electron/main.cjs to find us; never walk past
// the end of that range or the desktop window will not locate the backend.
const LAST_PORT = PORT + 4;

const startServerOnPort = (p) => {
  const server = app.listen(p, '127.0.0.1', () => {
    console.log(`[Express] Server running in ${process.env.NODE_ENV || 'development'} mode on http://127.0.0.1:${p}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && p < LAST_PORT) {
      console.warn(`[Express Warning] Port ${p} in use, trying port ${p + 1}...`);
      startServerOnPort(p + 1);
    } else {
      console.error(`[Express Error] Could not start server: ${err.message}`);
    }
  });
};

startServerOnPort(PORT);

// Exposed for electron/main.cjs, which loads this whole module via
// require(serverPath) — these let it cleanly stop the bundled database
// engine (e.g. before relocating its data folder) without reaching into
// backend internals directly.
export { shutdownDatabase, isUsingBundledEngine };
