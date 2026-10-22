import 'dotenv/config';
import { mailConfig, sendMail } from '../lib/mail.js';
import { z } from 'zod';

// No email or network request unless an explicit recipient is supplied.
try {
  mailConfig();
  const recipient = process.argv[2];
  if (recipient) {
    if (!z.email().safeParse(recipient).success)
      throw new Error('Supply a valid test recipient email.');
    await sendMail(
      recipient,
      'Edith email delivery check',
      'Resend accepted this test from Edith over HTTPS.',
    );
    console.log(
      'Resend accepted the test email. Check its delivery status in Resend and the recipient inbox.',
    );
  } else {
    console.log(
      'Resend environment configuration is valid. No email was sent; API access and delivery are not confirmed.',
    );
    console.log('To send a test: npm run check:email -- your-test-address@yourdomain.com');
  }
} catch (error) {
  console.error(error.body?.message || error.message);
  process.exitCode = 1;
}
