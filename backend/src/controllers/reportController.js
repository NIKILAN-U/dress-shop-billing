import { Sale } from '../models/Sale.js';
import { Product } from '../models/Product.js';
import { Expense } from '../models/Expense.js';
import { Purchase } from '../models/Purchase.js';
import { Return } from '../models/Return.js';
import { Customer } from '../models/Customer.js';

export const getDashboardStats = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Today's Sales Query
    const todaySales = await Sale.find({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
      status: { $ne: 'Cancelled' }
    });

    const todaySalesTotal = todaySales.reduce((sum, s) => sum + s.grandTotal, 0);
    const todayBillsCount = todaySales.length;

    // Today's Payment Channel Breakdown
    let todayCash = 0;
    let todayUpi = 0;
    let todayCard = 0;

    for (const sale of todaySales) {
      if (sale.payments && sale.payments.length > 0) {
        for (const p of sale.payments) {
          if (p.method === 'Cash') todayCash += p.amount;
          else if (p.method === 'UPI') todayUpi += p.amount;
          else if (p.method === 'Card' || p.method === 'BankTransfer') todayCard += p.amount;
        }
      } else {
        if (sale.paymentMethod === 'Cash') todayCash += sale.grandTotal;
        else if (sale.paymentMethod === 'UPI') todayUpi += sale.grandTotal;
        else if (sale.paymentMethod === 'Card' || sale.paymentMethod === 'BankTransfer') todayCard += sale.grandTotal;
      }
    }

    // Calculate Today's COGS for Profit Estimation
    let todayCogs = 0;
    for (const sale of todaySales) {
      for (const item of sale.items) {
        todayCogs += (item.purchasePrice || 0) * item.quantity;
      }
    }

    const todayExpenses = await Expense.find({ date: { $gte: startOfToday, $lte: endOfToday } });
    const todayExpenseTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

    const todayProfit = todaySalesTotal - todayCogs - todayExpenseTotal;

    // Products & Stock Metrics
    const products = await Product.find({ status: 'active' });
    const totalProductsCount = products.length;
    let totalStockCount = 0;
    let lowStockCount = 0;

    const lowStockItems = [];
    for (const p of products) {
      const itemStock = p.variants.reduce((acc, v) => acc + v.stock, 0);
      totalStockCount += itemStock;

      if (itemStock <= p.minStockLevel) {
        lowStockCount++;
        lowStockItems.push({
          _id: p._id,
          name: p.name,
          sku: p.sku,
          stock: itemStock,
          minStockLevel: p.minStockLevel
        });
      }
    }

    // Customer Pending Payments
    const customers = await Customer.find({ status: 'active', currentBalance: { $gt: 0 } });
    const pendingCustomerPayments = customers.reduce((sum, c) => sum + c.currentBalance, 0);

    // Recent items for Dashboard lists
    const recentBills = await Sale.find().sort({ createdAt: -1 }).limit(5);
    const recentPurchases = await Purchase.find().sort({ createdAt: -1 }).limit(5);
    const recentReturns = await Return.find().sort({ createdAt: -1 }).limit(5);

    // Sales Chart Data (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const last7DaysSales = await Sale.find({
      createdAt: { $gte: sevenDaysAgo },
      status: { $ne: 'Cancelled' }
    });

    const salesTrendMap = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      salesTrendMap[dateStr] = 0;
    }

    for (const s of last7DaysSales) {
      const dateStr = s.createdAt.toISOString().split('T')[0];
      if (salesTrendMap[dateStr] !== undefined) {
        salesTrendMap[dateStr] += s.grandTotal;
      }
    }

    const salesTrend = Object.keys(salesTrendMap)
      .sort()
      .map((date) => ({ date, amount: salesTrendMap[date] }));

    res.json({
      success: true,
      stats: {
        todaySalesTotal,
        todayBillsCount,
        todayProfit,
        totalProductsCount,
        totalStockCount,
        lowStockCount,
        todayCash,
        todayUpi,
        todayCard,
        pendingCustomerPayments
      },
      recentBills,
      lowStockItems,
      recentPurchases,
      recentReturns,
      salesTrend
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, cashier, paymentMethod } = req.query;
    const query = { status: { $ne: 'Cancelled' } };

    if (cashier) query.cashier = cashier;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const sales = await Sale.find(query)
      .populate('cashier', 'name')
      .populate('customer', 'name mobile')
      .sort({ createdAt: -1 });

    const totalSubtotal = sales.reduce((s, item) => s + item.subtotal, 0);
    const totalDiscount = sales.reduce((s, item) => s + (item.itemDiscountTotal + item.billDiscountTotal), 0);
    const totalTax = sales.reduce((s, item) => s + item.taxTotal, 0);
    const totalRevenue = sales.reduce((s, item) => s + item.grandTotal, 0);

    res.json({
      success: true,
      summary: {
        totalBills: sales.length,
        totalSubtotal,
        totalDiscount,
        totalTax,
        totalRevenue
      },
      sales
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProfitReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateQuery = {};

    if (startDate) {
      const parsedStart = new Date(startDate);
      if (!isNaN(parsedStart.getTime())) dateQuery.$gte = parsedStart;
    }

    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedEnd.getTime())) {
        parsedEnd.setHours(23, 59, 59, 999);
        dateQuery.$lte = parsedEnd;
      }
    }

    const salesMatch = { status: { $ne: 'Cancelled' } };
    if (Object.keys(dateQuery).length > 0) salesMatch.createdAt = dateQuery;

    const sales = await Sale.find(salesMatch);

    let salesRevenue = 0;
    let totalCogs = 0;
    let totalDiscount = 0;

    for (const sale of sales) {
      salesRevenue += sale.grandTotal;
      totalDiscount += (sale.itemDiscountTotal + sale.billDiscountTotal);
      for (const item of sale.items) {
        totalCogs += (item.purchasePrice || 0) * item.quantity;
      }
    }

    const expenseMatch = {};
    if (startDate || endDate) expenseMatch.date = dateQuery;

    const expenses = await Expense.find(expenseMatch);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    const grossProfit = salesRevenue - totalCogs;
    const estimatedNetProfit = grossProfit - totalExpenses;

    res.json({
      success: true,
      profitSummary: {
        salesRevenue,
        costOfGoodsSold: totalCogs,
        grossProfit,
        totalDiscount,
        totalExpenses,
        estimatedNetProfit
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
