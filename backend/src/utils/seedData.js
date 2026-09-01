import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { Brand } from '../models/Brand.js';
import { Product } from '../models/Product.js';
import { Supplier } from '../models/Supplier.js';
import { Customer } from '../models/Customer.js';
import { ShopSettings } from '../models/ShopSettings.js';
import { StockTransaction } from '../models/StockTransaction.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dress_shop';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB for seeding...');

    // Clear existing data and drop indexes
    try { await User.collection.drop(); } catch (e) {}
    try { await Category.collection.drop(); } catch (e) {}
    try { await Brand.collection.drop(); } catch (e) {}
    try { await Product.collection.drop(); } catch (e) {}
    try { await Supplier.collection.drop(); } catch (e) {}
    try { await Customer.collection.drop(); } catch (e) {}
    try { await ShopSettings.collection.drop(); } catch (e) {}
    try { await StockTransaction.collection.drop(); } catch (e) {}

    console.log('[Seed] Cleared old collection data.');

    // 1. Create Users
    const admin = await User.create({
      name: 'Shop Owner (Admin)',
      username: 'admin',
      mobile: '9876543210',
      password: 'admin123',
      role: 'admin',
      status: 'active'
    });

    const cashier = await User.create({
      name: 'Main Cashier',
      username: 'cashier',
      mobile: '9876543211',
      password: 'cashier123',
      role: 'cashier',
      status: 'active'
    });

    console.log('[Seed] Created default users: admin/admin123, cashier/cashier123');

    // 2. Create Categories
    const categoriesData = [
      { name: 'Men', description: 'Men apparel and ethnic wear' },
      { name: 'Women', description: 'Women sarees, kurtas, and western wear' },
      { name: 'Kids', description: 'Boys and girls clothing' },
      { name: 'Sarees', description: 'Silk, Cotton, and Synthetic Sarees' },
      { name: 'Shirts', description: 'Casual and Formal Shirts' },
      { name: 'Jeans', description: 'Denim Jeans for Men & Women' },
      { name: 'Kurta', description: 'Traditional Kurtas and Suits' },
      { name: 'Accessories', description: 'Belts, Caps, and Dupattas' }
    ];
    const categories = await Category.insertMany(categoriesData);

    // 3. Create Brands
    const brandsData = [
      { name: 'Raymond', description: 'Fine Fabric & Formals' },
      { name: 'Manyavar', description: 'Ethnic Celebration Wear' },
      { name: 'Allen Solly', description: 'Smart Casuals' },
      { name: 'FabIndia', description: 'Handloom & Organic Wear' },
      { name: 'Zara', description: 'Modern Fashion' },
      { name: 'Royal Silks', description: 'Authentic South Indian Sarees' }
    ];
    const brands = await Brand.insertMany(brandsData);

    // 4. Create Suppliers
    const suppliersData = [
      {
        name: 'Cotton Textiles Pvt Ltd',
        phone: '9123456780',
        email: 'sales@cottontextiles.com',
        address: 'Textile Hub, Tirupur, TN',
        gstNumber: '33AAACC1234F1Z0',
        openingBalance: 0
      },
      {
        name: 'Royal Silk Mills',
        phone: '9123456781',
        email: 'orders@royalsilkmills.com',
        address: 'Kanchipuram, TN',
        gstNumber: '33BBBCC5678F1Z2',
        openingBalance: 0
      }
    ];
    const suppliers = await Supplier.insertMany(suppliersData);

    // 5. Create Customers
    const customersData = [
      {
        name: 'Rajesh Kumar',
        mobile: '9988776655',
        email: 'rajesh@example.com',
        address: '15 Gandhi Road, City',
        gstNumber: ''
      },
      {
        name: 'Priya Sharma',
        mobile: '9876512345',
        email: 'priya@example.com',
        address: '42 Lake View Apartment, City',
        gstNumber: ''
      }
    ];
    const customers = await Customer.insertMany(customersData);

    // 6. Create Products with Variants
    const catMen = categories.find((c) => c.name === 'Men')._id;
    const catWomen = categories.find((c) => c.name === 'Women')._id;
    const catShirts = categories.find((c) => c.name === 'Shirts')._id;
    const catSarees = categories.find((c) => c.name === 'Sarees')._id;
    const catJeans = categories.find((c) => c.name === 'Jeans')._id;

    const brandRaymond = brands.find((b) => b.name === 'Raymond')._id;
    const brandRoyalSilks = brands.find((b) => b.name === 'Royal Silks')._id;
    const brandAllenSolly = brands.find((b) => b.name === 'Allen Solly')._id;

    const productsData = [
      {
        name: "Men's Cotton Formal Shirt",
        sku: 'MSH-001',
        category: catShirts,
        subcategory: 'Formal Shirts',
        brand: brandRaymond,
        gender: 'Men',
        description: '100% Premium Cotton Breathable Formal Shirt',
        purchasePrice: 450,
        sellingPrice: 899,
        mrp: 1299,
        taxPercent: 5,
        discountPercent: 10,
        minStockLevel: 5,
        supplier: suppliers[0]._id,
        variants: [
          { size: 'S', color: 'Sky Blue', barcode: '100001', stock: 15 },
          { size: 'M', color: 'Sky Blue', barcode: '100002', stock: 20 },
          { size: 'L', color: 'Sky Blue', barcode: '100003', stock: 18 },
          { size: 'XL', color: 'White', barcode: '100004', stock: 10 }
        ]
      },
      {
        name: 'Kanchipuram Pure Silk Saree',
        sku: 'WSR-101',
        category: catSarees,
        subcategory: 'Silk Sarees',
        brand: brandRoyalSilks,
        gender: 'Women',
        description: 'Traditional Handwoven Kanchipuram Silk Saree with Zari Border',
        purchasePrice: 2800,
        sellingPrice: 4999,
        mrp: 6999,
        taxPercent: 5,
        discountPercent: 5,
        minStockLevel: 3,
        supplier: suppliers[1]._id,
        variants: [
          { size: 'Free Size', color: 'Royal Maroon', barcode: '200001', stock: 8 },
          { size: 'Free Size', color: 'Peacock Green', barcode: '200002', stock: 6 }
        ]
      },
      {
        name: "Men's Slim Fit Denim Jeans",
        sku: 'MJN-301',
        category: catJeans,
        subcategory: 'Denim',
        brand: brandAllenSolly,
        gender: 'Men',
        description: 'Stretchable Durable Slim Fit Denim Pants',
        purchasePrice: 750,
        sellingPrice: 1499,
        mrp: 1999,
        taxPercent: 5,
        discountPercent: 15,
        minStockLevel: 4,
        supplier: suppliers[0]._id,
        variants: [
          { size: '30', color: 'Dark Indigo', barcode: '300001', stock: 12 },
          { size: '32', color: 'Dark Indigo', barcode: '300002', stock: 15 },
          { size: '34', color: 'Dark Indigo', barcode: '300003', stock: 10 },
          { size: '36', color: 'Black', barcode: '300004', stock: 7 }
        ]
      }
    ];

    for (const prodData of productsData) {
      const product = await Product.create(prodData);
      for (const v of product.variants) {
        if (v.stock > 0) {
          await StockTransaction.create({
            product: product._id,
            productName: product.name,
            variantId: v._id.toString(),
            variantBarcode: v.barcode,
            size: v.size,
            color: v.color,
            type: 'Opening',
            quantity: v.stock,
            previousStock: 0,
            newStock: v.stock,
            performedBy: admin._id,
            notes: 'Initial Demo Stock'
          });
        }
      }
    }

    console.log('[Seed] Created sample products with variant barcodes: 100001-100004, 200001-200002, 300001-300004');

    // 7. Shop Settings Initial Setup
    await ShopSettings.create({
      shopName: 'ELEGANCE DRESS SHOP',
      tagline: 'Fashion & Ethnic Trends',
      address: 'Main Commercial Road, Shop District',
      phone: '+91 98765 43210',
      email: 'sales@elegancedress.com',
      gstNumber: '33AAAAA0000A1Z5',
      invoicePrefix: 'INV-2026-',
      nextInvoiceNumber: 1001,
      currencySymbol: '₹',
      enableGst: true,
      defaultGstRate: 5,
      receiptWidth: '80mm',
      lowStockThreshold: 5,
      maxCashierDiscountPercent: 10
    });

    console.log('[Seed] Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  }
};

seedDB();
