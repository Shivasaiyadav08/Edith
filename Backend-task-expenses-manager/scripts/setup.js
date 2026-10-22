import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Run once. Existing configuration is never overwritten and secrets are never printed.
const folder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(folder, '.env');
if (fs.existsSync(target)) {
  console.log('Your .env already exists. Nothing was changed. See SETUP.md for each variable.');
} else {
  const template = fs.readFileSync(path.join(folder, '.env.example'), 'utf8');
  fs.writeFileSync(
    target,
    template.replace(
      /^BETTER_AUTH_SECRET=$/m,
      `BETTER_AUTH_SECRET=${crypto.randomBytes(32).toString('hex')}`,
    ),
    { flag: 'wx' },
  );
  console.log(
    'Created your ignored .env with a random auth secret and local defaults. Set MONGO_URI if using Atlas. Google, AI, and email are optional. See SETUP.md.',
  );
}
