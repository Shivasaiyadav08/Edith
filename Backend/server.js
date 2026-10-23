import 'dotenv/config';
import dns from 'node:dns';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import Account from './models/Account.js';
if (!process.env.MONGO_URI || !process.env.CLERK_SECRET_KEY || !process.env.CLERK_PUBLISHABLE_KEY)
  throw new Error('Set MONGO_URI, CLERK_PUBLISHABLE_KEY, and CLERK_SECRET_KEY. See .env.example.');
// Some Windows/Node installations report loopback DNS even without a DNS service.
// Use working public resolvers for Atlas in that specific case, within this process only.
if (
  process.platform === 'win32' &&
  process.env.MONGO_URI.startsWith('mongodb+srv://') &&
  dns.getServers().length > 0 &&
  dns.getServers().every((server) => ['127.0.0.1', '::1'].includes(server))
) {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
  console.log('Using public DNS for Atlas because Windows reported a loopback DNS server.');
}
try {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
} catch (error) {
  const dnsError = error.syscall === 'querySrv' || error.syscall === 'queryTxt';
  console.error(
    dnsError
      ? 'MongoDB DNS lookup failed. Check the Atlas hostname and DNS access. See README.md → MongoDB connection errors.'
      : 'MongoDB connection failed. Check the database user, password, cluster status, and current IP in Atlas Network Access. See README.md.',
  );
  console.error('Connection error:', error.code || error.name);
  process.exit(1);
}
await Account.init();
const app = createApp();
const server = app.listen(process.env.PORT || 5000, () =>
  console.log('Edith API listening on port', process.env.PORT || 5000),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    }),
  );
