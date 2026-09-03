import mongoose from 'mongoose';

const commissionPaymentSchema = new mongoose.Schema(
  {
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    staffId: { type: String, required: true },
    staffName: { type: String, required: true },
    amountPaid: { type: Number, required: true, min: 0.01 },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'BankTransfer', 'Cheque'],
      default: 'Cash'
    },
    notes: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

commissionPaymentSchema.index({ staff: 1, paymentDate: -1 });

export const CommissionPayment = mongoose.model('CommissionPayment', commissionPaymentSchema);
