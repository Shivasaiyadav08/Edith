import 'dotenv/config';
import mongoose from 'mongoose';
import { clerkClient } from '@clerk/express';
import Account from '../models/Account.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Expense from '../models/Expense.js';
import AiUsage from '../models/AiUsage.js';

// Explicit admin operation; never infer ownership from an email sent by a browser.
class AccountLinkError extends Error {}
const [legacyId, clerkId] = process.argv.slice(2);
if (!/^[a-f\d]{24}$/i.test(legacyId || '') || !/^user_[\w]+$/.test(clerkId || '')) {
  console.error('Usage: npm run link:account -- <old MongoDB user ID> <Clerk user ID>');
  process.exit(1);
}
try {
  if (!process.env.MONGO_URI || !process.env.CLERK_SECRET_KEY)
    throw new AccountLinkError('Set MONGO_URI and CLERK_SECRET_KEY first.');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  await Account.init();
  const legacy = await mongoose.connection.db
    .collection('auth_users')
    .findOne({ _id: new mongoose.Types.ObjectId(legacyId) });
  const user = await clerkClient.users.getUser(clerkId);
  const email = user.emailAddresses.find((item) => item.id === user.primaryEmailAddressId);
  if (
    !legacy?.email ||
    email?.verification?.status !== 'verified' ||
    legacy.email.trim().toLowerCase() !== email.emailAddress.trim().toLowerCase()
  )
    throw new AccountLinkError('The legacy account must match the verified primary Clerk email.');

  const current = await Account.findOne({ clerkId });
  if (current && current.owner.toString() !== legacyId.toLowerCase()) {
    const activity = await Promise.all(
      [Project, Task, Expense, AiUsage].map((model) => model.exists({ user: current.owner })),
    );
    if (activity.some(Boolean))
      throw new AccountLinkError(
        'This Clerk account already has workspace activity. Resolve ownership manually.',
      );
  }
  await Account.findOneAndUpdate(
    { clerkId },
    { $set: { owner: new mongoose.Types.ObjectId(legacyId) } },
    { upsert: true, new: true, runValidators: true },
  );
  console.log(
    'Account linked. Existing projects, tasks, expenses, settings, and AI usage are retained.',
  );
} catch (error) {
  // Provider and database errors may contain private request details.
  console.error(
    error.code === 11000
      ? 'This workspace is already linked to another Clerk account.'
      : error instanceof AccountLinkError
        ? error.message
        : 'Account linking failed. Check Clerk credentials, user ID, and database access.',
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
