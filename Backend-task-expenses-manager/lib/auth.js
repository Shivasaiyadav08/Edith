import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { emailOTP } from 'better-auth/plugins';
import bcrypt from 'bcryptjs';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { sendMail, mailEnabled, mailConfig } from './mail.js';
import { originSettings } from './origins.js';
export function createAuth(db) {
  // Never silently turn off email verification on a misconfigured production deployment.
  if (process.env.NODE_ENV === 'production') mailConfig();
  const { origins, baseURL } = originSettings();
  const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return betterAuth({
    appName: 'Edith',
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: mongodbAdapter(db),
    trustedOrigins: origins,
    user: { modelName: 'auth_users' },
    session: {
      modelName: 'auth_sessions',
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    account: { modelName: 'auth_accounts', accountLinking: { enabled: false } },
    verification: { modelName: 'auth_verifications' },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      requireEmailVerification: mailEnabled(),
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 30,
      password: {
        hash: hashPassword,
        verify: ({ hash, password }) =>
          hash.startsWith('$2')
            ? bcrypt.compare(password, hash)
            : verifyPassword({ hash, password }),
      },
      sendResetPassword: async ({ user, url }) =>
        sendMail(
          user.email,
          'Reset your Edith password',
          `Reset your password using this single-use link: ${url}\n\nThis link expires in 30 minutes. If you did not request this, ignore this email.`,
        ),
    },
    emailVerification: {
      expiresIn: 60 * 60,
      sendOnSignUp: mailEnabled(),
      sendOnSignIn: mailEnabled(),
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) =>
        sendMail(
          user.email,
          'Verify your Edith email',
          `Welcome to Edith. Verify your email: ${url}\n\nThis link expires in 1 hour. If you did not request an account, ignore this email.`,
        ),
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 3,
        storeOTP: 'hashed',
        disableSignUp: true,
        // Keep the existing signup verification links; codes are requested explicitly.
        sendVerificationOnSignUp: false,
        overrideDefaultEmailVerification: false,
        rateLimit: { window: 60, max: 3 },
        sendVerificationOTP: async ({ email, otp, type }) => {
          const purpose = {
            'sign-in': 'sign in to Edith',
            'email-verification': 'verify your Edith email',
            'forget-password': 'reset your Edith password',
            'change-email': 'change your Edith email',
          }[type];
          await sendMail(
            email,
            `Your Edith ${type === 'forget-password' ? 'password reset' : 'verification'} code`,
            `Use this code to ${purpose}: ${otp}\n\nIt expires in 5 minutes and can only be used once. Do not share it. If you did not request it, ignore this email.`,
          );
        },
      }),
    ],
    socialProviders: googleEnabled
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            prompt: 'select_account',
          },
        }
      : {},
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 60,
      customRules: {
        '/send-verification-email': { window: 60, max: 3 },
        '/request-password-reset': { window: 60, max: 3 },
        '/sign-up/email': { window: 60, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === 'production',
      cookiePrefix: 'edith',
      ipAddress: { ipAddressHeaders: ['x-edith-client-ip'] },
    },
  });
}
