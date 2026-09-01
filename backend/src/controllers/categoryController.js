import { Category } from '../models/Category.js';
import { logAudit } from '../middleware/auditLogger.js';

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ success: true, count: categories.length, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = await Category.create({ name: name.trim(), description });

    await logAudit({
      user: req.user,
      action: 'CREATE_CATEGORY',
      module: 'CATEGORIES',
      recordId: category._id,
      details: `Created category "${category.name}"`,
      req
    });

    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description;
    if (status) category.status = status;

    await category.save();

    await logAudit({
      user: req.user,
      action: 'UPDATE_CATEGORY',
      module: 'CATEGORIES',
      recordId: category._id,
      details: `Updated category "${category.name}"`,
      req
    });

    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Soft delete
    category.status = 'inactive';
    await category.save();

    await logAudit({
      user: req.user,
      action: 'DISABLE_CATEGORY',
      module: 'CATEGORIES',
      recordId: category._id,
      details: `Disabled category "${category.name}"`,
      req
    });

    res.json({ success: true, message: 'Category disabled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
