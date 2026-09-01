# Implementation Plan — Dress Shop Billing & Inventory Management Software (MERN + Windows Local Deployment)

Build a production-grade, offline-first Dress Shop Billing and Inventory Management System with Node.js, Express, MongoDB (local service), React, Vite, Tailwind CSS, and Redux Toolkit. The system will support fast POS barcode scanning, product variants (Size/Color/Barcode), automated stock transaction ledger, multi-payment split, GST calculation, thermal receipt printing (58mm/80mm), customer & supplier management, return processing, expense tracking, net profit analytics, automated database backups, and one-click Windows launcher scripts (`start.bat`, `install.bat`).

---

## Technical Architecture Overview

```text
               ┌─────────────────────────────────────────────────────────┐
               │                 WINDOWS SHOP COMPUTER                   │
               │                                                         │
               │   Browser POS App ──> Vite React + Redux Toolkit + POS   │
               │                                ↓                        │
               │                    Express.js REST API Server           │
               │                        (Serving static dist)            │
               │                                ↓                        │
               │                     Mongoose ODM Layer                  │
               │                                ↓                        │
               │                 Local MongoDB Engine (mongod)           │
               │                                                         │
               │   Peripherals:                                          │
               │   - USB Barcode Scanner (Keyboard Emulation mode)        │
               │   - 58mm / 80mm Thermal Receipt Printer                 │
               │                                                         │
               │   Automation & Maintenance:                             │
               │   - install.bat / start.bat / stop.bat                 │
               │   - Daily DB Backup script (mongodump / backup.bat)    │
               └─────────────────────────────────────────────────────────┘
```

---

## User Review Required

> [!IMPORTANT]
> **Local Environment Status**: 
> - Node.js (`v24.15.0`) & NPM (`11.12.1`) are present.
> - MongoDB service is installed and currently running (`MongoDB Server` on `127.0.0.1:27017`).
> - MongoDB Shell (`mongosh`) is installed.
> - `mongodump` / `mongorestore` tools will be checked/handled with fallback node-based JSON backup/restore mechanism if native database CLI tools are absent on target machines.

---

## Proposed System Design & Data Models

### 1. Database Schemas (`backend/src/models/`)

1. **`User`**: `name`, `username` (unique), `mobile`, `password` (hashed), `role` (`admin` / `cashier`), `status` (`active` / `inactive`), `lastLogin`.
2. **`Category`**: `name`, `description`, `status`.
3. **`Brand`**: `name`, `description`, `status`.
4. **`Product`**:
   - `name`, `sku` (unique), `category` (Ref), `subcategory`, `brand` (Ref), `gender` (`Men`/`Women`/`Kids`/`Unisex`), `description`.
   - `purchasePrice`, `sellingPrice`, `mrp`, `taxPercent` (GST %), `discountPercent`, `minStockLevel`, `supplier` (Ref), `status`.
   - `variants`: Array of `{ size: String, color: String, barcode: String (unique), stock: Number, skuSuffix: String }`.
5. **`StockTransaction`**: `product` (Ref), `variantId` (String), `type` (`Opening`, `Purchase`, `Sale`, `SalesReturn`, `PurchaseReturn`, `Adjustment`), `quantity` (+/-), `previousStock`, `newStock`, `referenceId` (Ref to Sale/Purchase/Return), `performedBy` (Ref User), `notes`, `createdAt`.
6. **`Supplier`**: `name`, `phone`, `email`, `address`, `gstNumber`, `openingBalance`, `currentBalance`, `notes`.
7. **`Purchase` & `PurchaseItem`**: `invoiceNumber`, `supplier` (Ref), `purchaseDate`, `items`: Array of `{ product, variantBarcode, variantSize, variantColor, quantity, purchasePrice, taxPercent, total }`, `subtotal`, `taxTotal`, `discount`, `grandTotal`, `paidAmount`, `balanceAmount`, `paymentStatus` (`Paid`, `Partial`, `Pending`), `createdBy`.
8. **`Customer`**: `name`, `mobile` (unique), `email`, `address`, `gstNumber`, `openingBalance`, `currentBalance`, `totalPurchases`, `totalPaid`.
9. **`Sale` & `SaleItem`**:
   - `invoiceNumber` (unique, e.g. `INV-2026-000001`), `customer` (Ref, default to Walk-in Customer), `cashier` (Ref User).
   - `items`: Array of `{ product: Ref, productName, variantBarcode, size, color, quantity, unitPrice, mrp, discountAmount, taxPercent, cgstAmount, sgstAmount, igstAmount, totalAmount }`.
   - `subtotal`, `itemDiscountTotal`, `billDiscountTotal`, `taxableAmount`, `cgstTotal`, `sgstTotal`, `igstTotal`, `roundOff`, `grandTotal`.
   - `paymentMethod` (`Cash`, `UPI`, `Card`, `BankTransfer`, `Mixed`), `payments`: Array of `{ method, amount, referenceNo }`.
   - `status` (`Completed`, `Returned`, `PartiallyReturned`, `Cancelled`), `notes`.
10. **`Return` & `ReturnItem`**: `returnNumber`, `originalSale` (Ref Sale), `customer` (Ref), `items`: Array of `{ product, variantBarcode, quantity, refundUnitPrice, totalRefund }`, `totalRefundAmount`, `refundMethod`, `reason`, `processedBy`.
11. **`Expense`**: `title`, `category` (`Electricity`, `Rent`, `Salary`, `Transport`, `Packaging`, `Maintenance`, `Other`), `amount`, `date`, `paymentMethod`, `description`, `recordedBy`.
12. **`ShopSettings`**: `shopName`, `tagline`, `logoUrl`, `address`, `phone`, `email`, `gstNumber`, `invoicePrefix`, `nextInvoiceNumber`, `currencySymbol`, `enableGst`, `defaultGstRate`, `receiptWidth` (`58mm`, `80mm`, `A4`), `lowStockThreshold`, `maxCashierDiscountPercent`, `keyboardShortcutsEnabled`.
13. **`AuditLog`**: `user` (Ref), `action`, `module`, `recordId`, `details`, `oldValue`, `newValue`, `ipAddress`, `timestamp`.

---

## Detailed Execution Phases

### Phase 1: Foundation & Architecture Setup
- Initialize root project folder structure: `backend/` and `frontend/`.
- Setup Node Express backend with ES modules, dotenv, mongoose, cors, helmet, jsonwebtoken, bcryptjs, winston/morgan logging.
- Setup Vite React frontend with Tailwind CSS, Lucide icons, Axios, React Router DOM v6, Redux Toolkit.
- Configure `.env` files for both frontend and backend.

### Phase 2: Core Backend Services & MongoDB Models
- Build Mongoose schemas with proper indexes (`barcode`, `sku`, `invoiceNumber`, `mobile`, `name`).
- Build middleware: `authMiddleware` (JWT validation & role checking `admin`/`cashier`), `errorMiddleware`, and `auditLogger`.
- Implement automated stock transaction helper service (`stockService.js`) to guarantee stock ledger consistency across Purchases, Sales, Returns, and Adjustments.
- Implement invoice counter auto-generation service (`invoiceNumberService.js`) ensuring atomic sequential invoice incrementing without duplicates (`INV-2026-000001`).

### Phase 3: REST API Controllers & Routes
- `authRoutes`: `/api/auth/login`, `/api/auth/me`, `/api/auth/change-password`.
- `userRoutes`: `/api/users` (CRUD for shop staff/cashiers).
- `categoryRoutes` & `brandRoutes`: CRUD with soft-delete `status`.
- `productRoutes`: Product & Variant management (Add variant, generate barcode, bulk stock edit, min stock alerts).
- `supplierRoutes` & `purchaseRoutes`: Inventory intake with automated stock increase.
- `customerRoutes`: Customer directory, purchase history & ledger.
- `saleRoutes`: POS sale generation, stock decrease, payment splitting, invoice query, hold/resume storage.
- `returnRoutes`: Process sale returns, inventory restore, refund logs.
- `inventoryRoutes`: Live stock levels, manual stock adjustment, stock transaction audit ledger.
- `expenseRoutes`: Operational expenses tracking.
- `reportRoutes`: Sales summary, Product performance, Stock evaluation, Expenses vs Revenue (Net Profit), Payment channel breakdown, Customer ledger.
- `settingRoutes`: Shop branding, GST settings, Invoice prefix, discount controls.
- `backupRoutes`: Trigger database dump & restore from UI.

### Phase 4: Frontend Design System & POS Workspace
- Create responsive modern layout: Dark sidebar, Topbar with quick stats/shortcuts, Notification toasts, Modal manager.
- Implement Global Redux Slices (`authSlice`, `posSlice`, `productSlice`, `settingSlice`).
- Build POS Billing Screen (`/pos`):
  - Fast barcode input listener (buffers scanner keystrokes).
  - Search modal for Product Name / SKU / Category / Size / Color filters.
  - Cart item row controls (quantity +/- , inline discount %, size/color switcher).
  - Customer selection with quick customer add modal.
  - Discount calculator (Item level + Bill level capped by cashier limits).
  - GST Calculator (CGST + SGST for intrastate, IGST for interstate, configurable).
  - Multi-Payment Split Modal (Cash, UPI, Card, Bank Transfer).
  - Bill Hold & Resume drawer (saves active cart state to local state).
  - Keyboard shortcuts listener (`F1`: New Bill, `F2`: Search, `F4`: Customer, `F8`: Payment, `F9`: Print, `ESC`: Cancel/Close).

### Phase 5: Thermal & A4 Printing Engine
- Create specialized printer templates in CSS/HTML:
  - **58mm Thermal Receipt**: Ultra-compact layout optimized for POS receipt printers.
  - **80mm Thermal Receipt**: Standard retail receipt with itemized tax and shop details.
  - **A4 Formal Tax Invoice**: Full-width invoice with HSN/SAC codes, terms, and signature block.
- Integrated `window.print()` triggered automatically post-bill generation with receipt configuration selection.

### Phase 6: Analytics, Dashboards & Audit Logs
- Admin Dashboard featuring:
  - KPI Cards: Today's Sales, Today's Bills, Estimated Profit, Total Products, Low Stock Count, Today's Cash/UPI/Card split.
  - Interactive charts (Recharts / Chart.js): Daily/Weekly/Monthly Sales trend, Top Selling Products pie, Category distribution.
  - Alerts table for Low Stock items, Recent Bills, Recent Returns.
- Comprehensive Reports module with export capability to Excel (`xlsx`), CSV, and printable PDF reports.
- Audit Log view for Admin monitoring price edits, cancelled bills, stock adjustments.

### Phase 7: Local Windows Deployment, Backup & Scripts
- Configure Express to serve Vite production static files from `frontend/dist` when `NODE_ENV=production`.
- Create Windows automated batch scripts in `scripts/`:
  - `install.bat`: Automated npm dependencies install for root, backend, frontend, build frontend.
  - `start.bat`: Starts local MongoDB (if needed) & launches unified Express application on `http://localhost:5000` + opens default browser automatically.
  - `stop.bat`: Gracefully stops the Node process.
  - `backup.bat`: Executes automated `mongodump` into `backups/` directory stamped with timestamp (`backup-YYYY-MM-DD-HHMMSS`).
  - `restore.bat`: Interactive database restore script.
- Create automated database seed script (`backend/src/utils/seedData.js`) populated with sample categories (Men, Women, Kids, Sarees), brands, sample products with variants, sizes (S, M, L, XL), colors, barcodes, admin/cashier credentials, settings.

---

## Verification & Testing Plan

### Automated Verification
1. `npm run test` or API endpoint testing:
   - Auth login with default admin (`admin` / `admin123`) & cashier (`cashier` / `cashier123`).
   - Create Product with Variants -> Verify Barcode uniqueness.
   - Purchase Intake -> Verify Stock increases & StockTransaction record logged.
   - Execute POS Sale -> Verify Stock decreases, Invoice sequential increment, Payment split validation.
   - Process Sale Return -> Verify Stock restores & Return record created.
   - Calculate Net Profit -> Verify `Revenue - COGS - Expenses = Net Profit`.
2. Frontend build verification: `npm run build` inside `frontend/` ensuring 0 compilation errors.

### Manual Verification Flow
1. Run `start.bat` -> App opens at `http://localhost:5000`.
2. POS Billing workflow: Scan barcode `100001` or search "Shirt" -> select size M -> add to cart -> select UPI payment -> click Generate Bill -> verify printable thermal bill pop-up.
3. Inventory audit: Check stock before and after bill generation.
4. Backup & Restore: Execute `/api/backups/create` and verify dump folder created.

---
