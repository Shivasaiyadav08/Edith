import mongoose from 'mongoose';

// Clerk handles credentials; this mapping keeps MongoDB record owners stable.
const schema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
    default: () => new mongoose.Types.ObjectId(),
  },
});

export default mongoose.model('Account', schema);
