import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Run once. Existing configuration is never overwritten and secrets are never printed.
const folder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(folder, '.env');
if (fs.existsSync(target)) {
  console.log('Your .env already exists. Nothing was changed. See README.md for each variable.');
} else {
  const template = fs.readFileSync(path.join(folder, '.env.example'), 'utf8');
  fs.writeFileSync(target, template, { flag: 'wx' });
  console.log(
    'Created your ignored .env. Add your MongoDB connection and Clerk keys. Gemini is optional. See README.md.',
  );
}
