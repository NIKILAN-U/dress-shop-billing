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
import { APP_ROOT } from './appPaths.js';
import { autoSeedIfEmpty } from './autoSeeder.js';

dotenv.config({ path: path.join(APP_ROOT, 'backend', '.env') });

/**
 * Destructive reset: drops the seeded collections and rebuilds them from
 * autoSeeder.js, which is the single definition of the demo dataset (the same
 * one the server runs on first launch).
 *
 * Run explicitly with `node backend/src/utils/seedData.js` — never on startup.
 */
const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dress_shop';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB for seeding...');

    for (const model of [User, Category, Brand, Product, Supplier, Customer, ShopSettings, StockTransaction]) {
      try {
        await model.collection.drop();
      } catch (e) {
        // Collection did not exist yet — nothing to drop.
      }
    }
    console.log('[Seed] Cleared old collection data.');

    await autoSeedIfEmpty();
    console.log('[Seed] Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  }
};

if (process.argv[1] && process.argv[1].includes('seedData.js')) {
  seedDB();
}
