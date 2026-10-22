import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    amount: { type: Number, required: true, min: 0 },
    amountMinor: { type: Number, min: 0 },
    currency: { type: String, default: 'USD' },
    category: { type: String, required: true, maxlength: 60 },
    merchant: { type: String, default: '', maxlength: 200 },
    date: { type: Date, required: true, default: Date.now },
    billable: { type: Boolean, default: false },
    notes: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true },
);
schema.index({ user: 1, date: -1 });
export default mongoose.model('Expense', schema);
