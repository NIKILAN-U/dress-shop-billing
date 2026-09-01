# Database Documentation & Schemas

The database uses MongoDB with Mongoose ODM models:

1. **User**: Staff credentials & role-based permissions (`admin`, `cashier`).
2. **Product**: Catalog items with multi-variant arrays (`size`, `color`, `barcode`, `stock`).
3. **Category**: Dress shop category hierarchy.
4. **Brand**: Apparel brand directory.
5. **StockTransaction**: Immutable transaction audit log tracking all stock increments/decrements.
6. **Supplier**: Supplier details and balance tracking.
7. **Purchase**: Stock intake invoices from suppliers.
8. **Customer**: Retail customer directory & purchase history ledger.
9. **Sale**: POS billing invoices with payment method splits.
10. **Return**: Sales return tracking and inventory restocking.
11. **Expense**: Shop operational expenses.
12. **ShopSettings**: Shop branding, invoice prefix, GST tax toggle, printer receipt width.
13. **AuditLog**: Security and administrative action audit trail.
