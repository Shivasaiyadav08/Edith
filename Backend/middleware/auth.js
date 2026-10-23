import { getAuth } from '@clerk/express';
import Account from '../models/Account.js';

export async function resolveOwner(clerkId) {
  try {
    return await Account.findOneAndUpdate(
      { clerkId },
      { $setOnInsert: { clerkId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    // Concurrent first requests can race the unique identity index.
    if (error.code !== 11000) throw error;
    const account = await Account.findOne({ clerkId });
    if (!account) throw error;
    return account;
  }
}

export async function requireAuth(req, res, next) {
  try {
    const { userId, isAuthenticated } = getAuth(req, { acceptsToken: 'session_token' });
    if (!isAuthenticated || !userId)
      return res.status(401).json({ message: 'Please sign in to continue.' });
    const account = await resolveOwner(userId);
    req.user = { id: account.owner.toString() };
    next();
  } catch (error) {
    next(error);
  }
}
