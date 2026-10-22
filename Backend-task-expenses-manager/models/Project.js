import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, maxlength: 150 },
    description: { type: String, default: '', maxlength: 3000 },
    client: { type: String, default: '', maxlength: 150 },
    budgetMinor: { type: Number, required: true, min: 0, default: 0 },
    revenueMinor: { type: Number, min: 0, default: null },
    color: {
      type: String,
      enum: ['violet', 'blue', 'green', 'orange'],
      default: 'violet',
    },
    dueDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['active', 'completed', 'on-hold'],
      default: 'active',
    },
  },
  { timestamps: true },
);
export default mongoose.model('Project', schema);
