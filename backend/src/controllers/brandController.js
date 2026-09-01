import { Brand } from '../models/Brand.js';
import { logAudit } from '../middleware/auditLogger.js';

export const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find().sort({ name: 1 });
    res.json({ success: true, count: brands.length, brands });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createBrand = async (req, res) => {
  try {
    const { name, description } = req.body;
    const existing = await Brand.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Brand already exists' });
    }

    const brand = await Brand.create({ name: name.trim(), description });

    await logAudit({
      user: req.user,
      action: 'CREATE_BRAND',
      module: 'BRANDS',
      recordId: brand._id,
      details: `Created brand "${brand.name}"`,
      req
    });

    res.status(201).json({ success: true, brand });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBrand = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    if (name) brand.name = name.trim();
    if (description !== undefined) brand.description = description;
    if (status) brand.status = status;

    await brand.save();

    await logAudit({
      user: req.user,
      action: 'UPDATE_BRAND',
      module: 'BRANDS',
      recordId: brand._id,
      details: `Updated brand "${brand.name}"`,
      req
    });

    res.json({ success: true, brand });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    brand.status = 'inactive';
    await brand.save();

    await logAudit({
      user: req.user,
      action: 'DISABLE_BRAND',
      module: 'BRANDS',
      recordId: brand._id,
      details: `Disabled brand "${brand.name}"`,
      req
    });

    res.json({ success: true, message: 'Brand disabled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
