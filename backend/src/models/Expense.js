import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Electricity', 'Rent', 'Salary', 'Transport', 'Packaging', 'Maintenance', 'Other'],
      required: true
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Card', 'BankTransfer'], default: 'Cash' },
    description: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recordedByName: { type: String }
  },
  { timestamps: true }
);

export const Expense = mongoose.model('Expense', expenseSchema);
