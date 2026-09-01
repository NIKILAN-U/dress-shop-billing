# Dress Shop Billing Software — System Architecture

## Architectural Diagram

```text
                 WINDOWS SHOP COMPUTER
┌──────────────────────────────────────────────┐
│                                              │
│              Browser                         │
│                ↓                             │
│       React Production Build                 │
│                ↓                             │
│        Node.js + Express                     │
│                ↓                             │
│             Mongoose                         │
│                ↓                             │
│             MongoDB                          │
│                ↓                             │
│          Local Database                      │
│                                              │
│  USB Barcode Scanner                         │
│          ↓                                   │
│  Thermal Printer (58mm / 80mm / A4)          │
│                                              │
│  Automatic Daily Backup                      │
│                                              │
└──────────────────────────────────────────────┘
```

## System Components
1. **Frontend**: React + Vite + Tailwind CSS + Redux Toolkit. Built into static assets served directly by Express in production.
2. **Backend**: Express REST API running on port 5000 with JWT authentication and bcrypt password hashing.
3. **Database**: Local MongoDB service (`mongodb://127.0.0.1:27017/dress_shop`).
4. **Offline Capability**: Operations work 100% offline without cloud connectivity.
