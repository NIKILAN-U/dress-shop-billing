# API Endpoints Documentation

## Authentication & Users
- `POST /api/auth/login` — Login user & return JWT token.
- `GET /api/auth/me` — Get current logged-in user profile.
- `GET /api/users` — List staff users (Admin only).

## Catalog & Inventory
- `GET /api/products` — Filter products by category, brand, search, low stock.
- `GET /api/products/barcode/:barcode` — Fast POS barcode lookup.
- `POST /api/products` — Create product & variants.
- `GET /api/inventory/summary` — Live stock levels.
- `GET /api/inventory/transactions` — Audit stock transaction ledger.
- `POST /api/inventory/adjust` — Manual stock level adjustment.

## Billing & Sales
- `POST /api/sales` — Create POS sale & generate sequential invoice number.
- `GET /api/sales` — Sales history list.
- `PUT /api/sales/:id/cancel` — Void invoice and restore inventory.

## Returns & Expenses
- `POST /api/returns` — Process customer return & restock inventory.
- `GET /api/expenses` — List operating expenses.
- `POST /api/expenses` — Record expense.

## Reports & Settings
- `GET /api/reports/dashboard` — Dashboard analytics & stats.
- `GET /api/reports/sales` — Sales revenue report.
- `GET /api/reports/profit` — Net profit breakdown.
- `GET /api/settings` — Shop configuration.
- `PUT /api/settings` — Save shop settings.
