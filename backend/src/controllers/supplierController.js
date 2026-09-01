import { Supplier } from '../models/Supplier.js';
import { Purchase } from '../models/Purchase.js';
import { logAudit } from '../middleware/auditLogger.js';

export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ status: 'active' }).sort({ name: 1 });
    res.json({ success: true, count: suppliers.length, suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSupplier = async (req, res) => {
  try {
    const { name, phone, email, address, gstNumber, openingBalance, notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Supplier name and phone are required' });
    }

    const supplier = await Supplier.create({
      name: name.trim(),
      phone: phone.trim(),
      email,
      address,
      gstNumber,
      openingBalance: openingBalance || 0,
      currentBalance: openingBalance || 0,
      notes
    });

    await logAudit({
      user: req.user,
      action: 'CREATE_SUPPLIER',
      module: 'SUPPLIERS',
      recordId: supplier._id,
      details: `Created supplier "${supplier.name}"`,
      req
    });

    res.status(201).json({ success: true, supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const { name, phone, email, address, gstNumber, notes, status } = req.body;

    if (name) supplier.name = name.trim();
    if (phone) supplier.phone = phone.trim();
    if (email !== undefined) supplier.email = email;
    if (address !== undefined) supplier.address = address;
    if (gstNumber !== undefined) supplier.gstNumber = gstNumber;
    if (notes !== undefined) supplier.notes = notes;
    if (status) supplier.status = status;

    await supplier.save();

    await logAudit({
      user: req.user,
      action: 'UPDATE_SUPPLIER',
      module: 'SUPPLIERS',
      recordId: supplier._id,
      details: `Updated supplier "${supplier.name}"`,
      req
    });

    res.json({ success: true, supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSupplierHistory = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const purchases = await Purchase.find({ supplier: supplier._id }).sort({ createdAt: -1 });

    const totalPurchases = purchases.reduce((sum, p) => sum + p.grandTotal, 0);
    const paidAmount = purchases.reduce((sum, p) => sum + p.paidAmount, 0);
    const pendingAmount = purchases.reduce((sum, p) => sum + p.balanceAmount, 0);

    res.json({
      success: true,
      supplier,
      stats: {
        totalPurchases,
        paidAmount,
        pendingAmount
      },
      purchases
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
