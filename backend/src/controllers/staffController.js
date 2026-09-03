import { Staff } from '../models/Staff.js';
import { CommissionPayment } from '../models/CommissionPayment.js';
import { Sale } from '../models/Sale.js';
import { Return } from '../models/Return.js';

// Helper for date filter ranges
const getDateRange = (filter, customStart, customEnd) => {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  if (filter === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (filter === 'yesterday') {
    start.setDate(now.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(now.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  } else if (filter === 'this_week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    end = new Date();
    end.setHours(23, 59, 59, 999);
  } else if (filter === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  } else if (filter === 'custom' && customStart && customEnd) {
    start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
  } else {
    // All time
    start = new Date(2000, 0, 1);
    end = new Date(2099, 11, 31);
  }

  return { start, end };
};

// 1. Get all staff members
export const getStaff = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { staffId: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }
    const staffList = await Staff.find(query).sort({ staffId: 1 });
    res.json({ success: true, staff: staffList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Create new staff member
export const createStaff = async (req, res) => {
  try {
    const { name, mobile, joiningDate, status, notes } = req.body;
    let { staffId } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ success: false, message: 'Name and mobile number are required' });
    }

    // Auto-generate Staff ID if not provided (e.g. ST001, ST002)
    if (!staffId || staffId.trim() === '') {
      const count = await Staff.countDocuments();
      staffId = `ST${String(count + 1).padStart(3, '0')}`;
      // Ensure unique
      let exists = await Staff.findOne({ staffId });
      let counter = count + 1;
      while (exists) {
        counter++;
        staffId = `ST${String(counter).padStart(3, '0')}`;
        exists = await Staff.findOne({ staffId });
      }
    } else {
      staffId = staffId.trim().toUpperCase();
      const existing = await Staff.findOne({ staffId });
      if (existing) {
        return res.status(400).json({ success: false, message: `Staff ID ${staffId} already exists` });
      }
    }

    const staffMember = new Staff({
      staffId,
      name: name.trim(),
      mobile: mobile.trim(),
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      status: status || 'Active',
      notes: notes ? notes.trim() : ''
    });

    await staffMember.save();
    res.status(201).json({ success: true, message: 'Staff member created successfully', staff: staffMember });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Update staff member
export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, joiningDate, status, notes } = req.body;

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    if (name) staff.name = name.trim();
    if (mobile) staff.mobile = mobile.trim();
    if (joiningDate) staff.joiningDate = new Date(joiningDate);
    if (status) staff.status = status;
    if (notes !== undefined) staff.notes = notes.trim();

    await staff.save();
    res.json({ success: true, message: 'Staff updated successfully', staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Get Staff Commission Summary (Dashboard KPI & Summary Table)
export const getCommissionSummary = async (req, res) => {
  try {
    const { filter = 'this_month', startDate, endDate, staffId } = req.query;
    const { start, end } = getDateRange(filter, startDate, endDate);

    // Fetch staff list
    const staffQuery = {};
    if (staffId) staffQuery._id = staffId;
    const staffList = await Staff.find(staffQuery).sort({ staffId: 1 });

    // Fetch Completed Sales in date range
    const sales = await Sale.find({
      status: { $ne: 'Cancelled' },
      createdAt: { $gte: start, $lte: end }
    });

    // Fetch Returns in date range
    const returns = await Return.find({
      createdAt: { $gte: start, $lte: end }
    });

    // Fetch Payouts in date range (or total payouts)
    const allPayouts = await CommissionPayment.find({});

    const summaryMap = {};
    staffList.forEach((s) => {
      summaryMap[s._id.toString()] = {
        _id: s._id,
        staffId: s.staffId,
        name: s.name,
        mobile: s.mobile,
        status: s.status,
        totalProductsSold: 0,
        totalSalesAmount: 0,
        totalCommissionEarned: 0,
        totalCommissionPaid: 0,
        pendingCommission: 0
      };
    });

    // Process Sales Items
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (item.staff) {
          const sKey = item.staff.toString();
          if (summaryMap[sKey]) {
            summaryMap[sKey].totalProductsSold += item.quantity || 0;
            summaryMap[sKey].totalSalesAmount += item.totalAmount || 0;
            summaryMap[sKey].totalCommissionEarned += item.commissionAmount || 0;
          }
        }
      });
    });

    // Process Returns Reversals
    returns.forEach((ret) => {
      ret.items.forEach((item) => {
        if (item.staff) {
          const sKey = item.staff.toString();
          if (summaryMap[sKey]) {
            summaryMap[sKey].totalCommissionEarned -= item.reversedCommissionAmount || 0;
          }
        }
      });
    });

    // Process Payouts
    allPayouts.forEach((payout) => {
      const sKey = payout.staff.toString();
      if (summaryMap[sKey]) {
        summaryMap[sKey].totalCommissionPaid += payout.amountPaid || 0;
      }
    });

    // Calculate Pending & Round numbers
    const resultList = Object.values(summaryMap).map((s) => {
      s.totalSalesAmount = Math.round(s.totalSalesAmount * 100) / 100;
      s.totalCommissionEarned = Math.round(Math.max(0, s.totalCommissionEarned) * 100) / 100;
      s.totalCommissionPaid = Math.round(s.totalCommissionPaid * 100) / 100;
      s.pendingCommission = Math.round(Math.max(0, s.totalCommissionEarned - s.totalCommissionPaid) * 100) / 100;
      return s;
    });

    // Calculate Global Totals
    const grandTotals = {
      totalProductsSold: resultList.reduce((sum, s) => sum + s.totalProductsSold, 0),
      totalSalesAmount: Math.round(resultList.reduce((sum, s) => sum + s.totalSalesAmount, 0) * 100) / 100,
      totalCommissionEarned: Math.round(resultList.reduce((sum, s) => sum + s.totalCommissionEarned, 0) * 100) / 100,
      totalCommissionPaid: Math.round(resultList.reduce((sum, s) => sum + s.totalCommissionPaid, 0) * 100) / 100,
      pendingCommission: Math.round(resultList.reduce((sum, s) => sum + s.pendingCommission, 0) * 100) / 100
    };

    res.json({
      success: true,
      summary: resultList,
      grandTotals,
      dateRange: { start, end }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Record Commission Payment to Staff
export const recordCommissionPayment = async (req, res) => {
  try {
    const { staffId, amountPaid, paymentMethod, notes, paymentDate } = req.body;

    if (!staffId || !amountPaid || Number(amountPaid) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid staff member and amount are required' });
    }

    const staffMember = await Staff.findById(staffId);
    if (!staffMember) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    const payment = new CommissionPayment({
      staff: staffMember._id,
      staffId: staffMember.staffId,
      staffName: staffMember.name,
      amountPaid: Number(amountPaid),
      paymentMethod: paymentMethod || 'Cash',
      notes: notes ? notes.trim() : '',
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      recordedBy: req.user?._id || null
    });

    await payment.save();

    res.status(201).json({
      success: true,
      message: `Successfully recorded commission payment of ₹${amountPaid} for ${staffMember.name}`,
      payment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Get Commission Payment History
export const getPaymentHistory = async (req, res) => {
  try {
    const { staffId } = req.query;
    const query = {};
    if (staffId) query.staff = staffId;

    const payments = await CommissionPayment.find(query).sort({ paymentDate: -1 });
    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Get Itemized Sales Commission Ledger
export const getItemizedCommissionLedger = async (req, res) => {
  try {
    const { filter = 'this_month', startDate, endDate, staffId } = req.query;
    const { start, end } = getDateRange(filter, startDate, endDate);

    const query = {
      status: { $ne: 'Cancelled' },
      createdAt: { $gte: start, $lte: end }
    };

    const sales = await Sale.find(query).sort({ createdAt: -1 });

    const itemizedList = [];
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (item.staff) {
          if (!staffId || item.staff.toString() === staffId) {
            itemizedList.push({
              saleId: sale._id,
              invoiceNumber: sale.invoiceNumber,
              date: sale.createdAt,
              customerName: sale.customerName,
              staffId: item.staffId,
              staffName: item.staffName,
              productName: item.productName,
              sizeColor: `${item.size} / ${item.color}`,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
              commissionType: item.commissionType || 'Percentage',
              commissionValue: item.commissionValue || 0,
              commissionAmount: item.commissionAmount || 0
            });
          }
        }
      });
    });

    res.json({ success: true, items: itemizedList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
