import { Customer } from '../models/Customer.js';
import { Sale } from '../models/Sale.js';
import { logAudit } from '../middleware/auditLogger.js';

export const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    const query = { status: 'active' };

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { mobile: searchRegex }];
    }

    const customers = await Customer.find(query).sort({ name: 1 });
    res.json({ success: true, count: customers.length, customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const sales = await Sale.find({ customer: customer._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      customer,
      salesHistory: sales
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const { name, mobile, email, address, gstNumber, openingBalance } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ success: false, message: 'Customer name and mobile number are required' });
    }

    const existing = await Customer.findOne({ mobile: mobile.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Customer with this mobile number already exists' });
    }

    const customer = await Customer.create({
      name: name.trim(),
      mobile: mobile.trim(),
      email,
      address,
      gstNumber,
      openingBalance: openingBalance || 0,
      currentBalance: openingBalance || 0
    });

    await logAudit({
      user: req.user,
      action: 'CREATE_CUSTOMER',
      module: 'CUSTOMERS',
      recordId: customer._id,
      details: `Created customer "${customer.name}" (${customer.mobile})`,
      req
    });

    res.status(201).json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const { name, mobile, email, address, gstNumber, status } = req.body;

    if (name) customer.name = name.trim();
    if (mobile) customer.mobile = mobile.trim();
    if (email !== undefined) customer.email = email;
    if (address !== undefined) customer.address = address;
    if (gstNumber !== undefined) customer.gstNumber = gstNumber;
    if (status) customer.status = status;

    await customer.save();

    await logAudit({
      user: req.user,
      action: 'UPDATE_CUSTOMER',
      module: 'CUSTOMERS',
      recordId: customer._id,
      details: `Updated customer "${customer.name}"`,
      req
    });

    res.json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
