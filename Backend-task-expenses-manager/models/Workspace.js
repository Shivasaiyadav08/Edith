import mongoose from 'mongoose';

export const currencies = ['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'AED'];
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  currency: { type: String, enum: currencies, default: 'USD' },
});
export default mongoose.model('Workspace', schema);
