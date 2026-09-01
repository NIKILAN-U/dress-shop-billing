# Dress Shop Billing & Inventory Management Software (MERN Stack)

A complete, production-ready **Dress Shop Billing and Inventory Management System** built with **MongoDB, Express.js, React, Node.js, Tailwind CSS, and Redux Toolkit**. Designed specifically for **offline local deployment on Windows PCs**.

---

## Key Features

### POS Billing Screen
- **Fast USB Barcode Scanning**: Scan variant barcodes (`100001`, `100002`, etc.) to instantly add items to cart.
- **Product Variants**: Full support for Size (S, M, L, XL, XXL, custom), Color, Barcode, and Stock per variant.
- **Keyboard Shortcuts**: `F1` (New Bill), `F2` (Search Catalog), `F4` (Select Customer), `F8` (Payment Modal), `F9` (Confirm & Print).
- **Discounts & GST**: Item-level discounts, bill-level discounts (with cashier limit enforcement), CGST/SGST/IGST calculation, round-off.
- **Multi-Payment Split**: Cash, UPI, Card, Bank Transfer, or Mixed payment split.
- **Bill Hold & Resume**: Hold active cart items and resume later.
- **Thermal Receipt Printing**: Instant print layout optimized for **58mm**, **80mm** thermal printers, and formal **A4** tax invoices.

### Inventory & Stock Ledger
- **Automatic Stock Tracking**: Purchases INCREASE stock, POS sales DECREASE stock, Sales Returns INCREASE stock.
- **Audit Ledger**: Comprehensive `StockTransaction` ledger log recording every stock change with reason, user, and timestamp.
- **Low Stock Alerts**: Real-time alerts on dashboard for items below minimum threshold.

### Returns & Expenses
- **Customer Returns**: Process full/partial returns against original invoices with automatic inventory restocking.
- **Expense Manager**: Track shop expenses (Electricity, Rent, Salary, Transport, Packaging) included in Net Profit calculations.

### Financial Analytics & Reports
- **Executive Dashboard**: KPI stat cards, 7-day sales revenue trend chart, recent bills, low stock alerts.
- **Net Profit Report**: `Sales Revenue - Cost of Goods Sold (COGS) - Expenses = Estimated Net Profit`.
- **Excel Export**: Export sales reports directly to `.xlsx` files.

### Windows Deployment & Backups
- **One-Click Batch Launchers**: `install.bat`, `start.bat`, `stop.bat`, `backup.bat`, `restore.bat`.
- **Single Express Production Server**: React production dist bundle served directly on `http://localhost:5000`.
- **Local Database Snapshots**: Create database backups and restore from UI or batch script.

---

## Quick Start (Windows Local)

### 1. Installation
Run `scripts/install.bat` or execute:
```bash
cd backend && npm install
cd ../frontend && npm install && npm run build
```

### 2. Database Seeding (Demo Data)
```bash
cd backend
npm run seed
```

### 3. Start Application
Run `scripts/start.bat` or execute:
```bash
cd backend
npm start
```
Open browser at: **`http://localhost:5000`**

---

## Default Login Credentials
- **Admin**: Username: `admin` | Password: `admin123`
- **Cashier**: Username: `cashier` | Password: `cashier123`

---

## Project Structure
```text
dress-shop/
├── backend/            # Express, Mongoose, Auth, Services, Controllers
├── frontend/           # Vite, React, Redux Toolkit, Tailwind POS UI
├── backups/            # Database JSON snapshot backups
├── scripts/            # Windows install, start, stop, backup batch scripts
└── docs/               # System architecture, API, DB & printer setup docs
```
