import { Expense } from '../models/Expense.js';
import { logAudit } from '../middleware/auditLogger.js';

export const getExpenses = async (req, res) => {
  try {
    const { category, startDate, endDate } = req.query;
    const query = {};

    if (category) query.category = category;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const expenses = await Expense.find(query).sort({ date: -1 });
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({ success: true, count: expenses.length, totalExpense, expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createExpense = async (req, res) => {
  try {
    const { title, category, amount, date, paymentMethod, description } = req.body;

    if (!title || !category || amount === undefined) {
      return res.status(400).json({ success: false, message: 'Expense title, category and amount are required' });
    }

    const expense = await Expense.create({
      title: title.trim(),
      category,
      amount: Number(amount),
      date: date || new Date(),
      paymentMethod: paymentMethod || 'Cash',
      description,
      recordedBy: req.user._id,
      recordedByName: req.user.name
    });

    await logAudit({
      user: req.user,
      action: 'CREATE_EXPENSE',
      module: 'EXPENSES',
      recordId: expense._id,
      details: `Recorded expense "${expense.title}" of ₹${expense.amount} under ${expense.category}`,
      req
    });

    res.status(201).json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    await logAudit({
      user: req.user,
      action: 'DELETE_EXPENSE',
      module: 'EXPENSES',
      recordId: req.params.id,
      details: `Deleted expense "${expense.title}" of ₹${expense.amount}`,
      req
    });

    res.json({ success: true, message: 'Expense record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
