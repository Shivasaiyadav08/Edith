# Edith: exactly where every .env value comes from

**For the local development preview, you need no .env file.** Start the frontend with `npm run dev` and open http://localhost:5173. The preview uses browser-only sample data.

**For real email/password accounts, you only need a database.** In `Backend-task-expenses-manager`, run:

```sh
npm run setup
```

This creates an ignored `.env`, generates your auth secret, and fills in local defaults. Existing `.env` files are never overwritten. Do not share secrets in chat or commit this file.

## Required for saving your own work

| Variable | Where to get it | What to do |
| --- | --- | --- |
| `MONGO_URI` | MongoDB installed locally, or [MongoDB Atlas](https://cloud.mongodb.com) | Local MongoDB: leave `mongodb://127.0.0.1:27017/edith`. Atlas: create a cluster, create a **database user**, add your current IP in Network Access, select **Connect → Drivers → Node.js**, and copy the URI. Replace the password placeholder with that database user's password and put `edith` after the hostname's `/`. URL-encode special characters in the password. |
| `BETTER_AUTH_SECRET` | Your computer | `npm run setup` generates this automatically. To generate manually: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. It must stay private and stable between server restarts. |

Atlas database users are separate from your Atlas website login. [Official connection guide](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/).

## MongoDB connection errors

`querySrv ECONNREFUSED` means Node could not resolve the Atlas DNS record, before database authentication. On affected Windows installations, Node reports only loopback DNS (`127.0.0.1` or `::1`). Edith detects this case for `mongodb+srv://` connections and uses Cloudflare (`1.1.1.1`) and Google (`8.8.8.8`) DNS in the backend process. Your Windows network settings are not changed.

Restart the backend with `npm run dev`. If the DNS error persists, check that the cluster is active and copy its hostname again from Atlas **Connect → Drivers**. Networks that block public DNS can use the standard `mongodb://` connection string provided by Atlas: disable the **SRV Connection String** toggle in the Connect dialog and copy the entire generated URI. Do not just remove `+srv` from your existing URI. See [Atlas connection troubleshooting](https://www.mongodb.com/docs/atlas/troubleshoot-connection/).

After DNS works, a different connection error may require adding your current IP under **Network Access**, or checking the **database user's** username/password. Add your own IP rather than allowing every address.

## Local defaults: no account or key needed

| Variable | Value locally | Meaning |
| --- | --- | --- |
| `PORT` | `5000` | Express API port. Keep it aligned with the Vite proxy. |
| `BETTER_AUTH_URL` | `http://localhost:5173` | Public origin used for auth and Google callbacks. |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed browser origin and email-link destination. |
| `TRUST_PROXY` | `0` | Keep off locally. Hosting only: set `1` if one trusted proxy sits in front of Express. |

Both **http://localhost:5173** and **http://127.0.0.1:5173** are accepted in local development. Login, registration, and password-reset pages automatically move to the hostname in `BETTER_AUTH_URL` (normally `localhost`) before starting authentication. This keeps the Google state cookie and callback on the same host. Sessions belong to that hostname. Production trusts only your explicitly configured origins. Your frontend needs no environment variables with the standard Vite proxy. `Frontend-task-expense-manager/.env.example` contains optional `VITE_API_ORIGIN`; leave it blank for this setup.

## Optional: enable Google login

1. Open [Google Cloud Console](https://console.cloud.google.com/), select or create a project.
2. Open **Google Auth Platform**. Configure **Branding**, **Audience**, and your consent-screen contact details. If the app is in testing, add your Google email as a test user.
3. Open **Clients → Create client → Web application** (the older menu calls it **APIs & Services → Credentials → OAuth client ID**).
4. Add JavaScript origin `http://localhost:5173` and the exact authorized redirect URI:

   ```text
   http://localhost:5173/api/auth/callback/google
   ```

   Use the hostname in `BETTER_AUTH_URL` for these Google settings. Local auth pages redirect there automatically, even when you first open Edith at `127.0.0.1`.

5. Copy the **Client ID** into `GOOGLE_CLIENT_ID` and the **Client secret** into `GOOGLE_CLIENT_SECRET`.
6. Restart Express. Google sign-in is now enabled. Both values must be present.

These are OAuth credentials, not an AI API key. Keep the client secret on the backend. [Google integration guide](https://better-auth.com/docs/authentication/google).

If an old attempt reports **State not persisted correctly**, return to `http://localhost:5173/login` and start one fresh attempt in the same tab. Don't reuse a callback URL or start concurrent Google sign-ins. Edith uses its own `edith.*` cookies, with HttpOnly and SameSite=Lax, and keeps the state-cookie CSRF check enabled. The backend supplies a server-controlled client IP header for Better Auth rate limits; incoming copies of that header are overwritten. In production, configure `TRUST_PROXY` only for your actual trusted proxy layout.

## Optional: enable live Ultron AI

| Variable | Where to get it |
| --- | --- |
| `GEMINI_API_KEY` | Open [Google AI Studio → API keys](https://aistudio.google.com/apikey), sign in, choose **Create API key**, and select or create a Google Cloud project. Copy the key into the backend `.env`. Keep it private. This is separate from your Google login OAuth credentials. |
| `GEMINI_MODEL` | Optional. Leave `gemini-3.5-flash-lite`, the default. It supports image input, structured output, and function calling. If your project needs another model, copy its exact ID from Google's model documentation; no `google/` prefix is needed. |

```env
GEMINI_API_KEY=your-private-google-ai-studio-key
GEMINI_MODEL=gemini-3.5-flash-lite
```

Restart Express after adding the key. Ultron calls Google directly; no Vercel account or AI Gateway key is needed. Old `AI_GATEWAY_` variables are unused and may be removed. Without a Gemini key, the demo shows labeled sample results and real accounts show that AI is unconfigured. [Google API key guide](https://ai.google.dev/gemini-api/docs/api-key).

Google currently lists a **free tier** for this model, with project-specific rate and usage limits. Stay on an eligible free-tier project if you do not want paid usage. Check [current pricing](https://ai.google.dev/gemini-api/docs/pricing) and your AI Studio quota. Free-tier inputs and outputs may be used to improve Google's products; use sample receipts while testing. Model capabilities: [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite).

## Email: Resend HTTPS API

Edith sends all authentication emails through `https://api.resend.com/emails` on port 443. No SMTP connection or Gmail App Password is used, so this works with Render Free's SMTP restrictions.

1. Create a [Resend account](https://resend.com), add a domain you own in **Domains**, and publish the DNS records Resend supplies. Wait until the domain is verified. You cannot verify a shared `onrender.com` domain or use a Gmail address as the sender.
2. In **API Keys**, create a **Sending access** key restricted to that sending domain. Keep the key private.
3. Set these variables in the backend `.env` locally or **Render service → Environment** in production:

```env
RESEND_API_KEY=re_REPLACE_WITH_YOUR_PRIVATE_KEY
RESEND_FROM_EMAIL="Edith <hello@your-verified-domain.com>"
```

In Render, enter the sender value without the surrounding quotes. Never use `VITE_` for secrets. Delete the old `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` variables; they are no longer read. Restart/redeploy after setting the new values. See [Resend's sending API](https://resend.com/docs/api-reference/emails/send-email).

For production, also retain `NODE_ENV=production`, `TRUST_PROXY=1`, and set `BETTER_AUTH_URL` and `FRONTEND_URL` to the same public HTTPS origin. Keep your existing auth secret stable. Production startup fails with a configuration message if Resend settings are missing or malformed; it never silently bypasses email verification. Local development can omit both Resend variables and use email/password signup without verification, as before.

The test sender `onboarding@resend.dev` can only send to your own Resend account email. A verified sending domain is required to send to other users. The sender domain can differ from the app's Render domain. [Resend domain restrictions](https://resend.com/docs/api-reference/errors).

The login/register screens still support verification links and resending; password recovery still uses a single-use link. Verification links expire in 1 hour; reset links expire in 30 minutes. Existing accounts, passwords, Google login, and sessions remain supported. Password resets revoke existing sessions.

### OTP API

Better Auth's email OTP plugin is available through the existing `/api/auth` handler and the shared frontend `authClient`. Codes are 6 digits, expire after 5 minutes, are stored hashed, allow 3 failed attempts, and are single-use. Sending/verification endpoints are rate-limited. OTP does not automatically create accounts or send a second code on signup; existing verification-link screens continue to work.

| Action | POST path after `/api/auth` | JSON body |
| --- | --- | --- |
| Send code | `/email-otp/send-verification-otp` | `{ "email": "user@domain.com", "type": "email-verification" }` (or `sign-in`) |
| Verify email | `/email-otp/verify-email` | `{ "email": "user@domain.com", "otp": "123456" }` |
| Sign in with code | `/sign-in/email-otp` | `{ "email": "user@domain.com", "otp": "123456" }` |
| Request password reset code | `/email-otp/request-password-reset` | `{ "email": "user@domain.com" }` |
| Reset password with code | `/email-otp/reset-password` | `{ "email": "user@domain.com", "otp": "123456", "password": "new-strong-password" }` |

Use the Better Auth client methods `emailOtp.sendVerificationOtp`, `emailOtp.verifyEmail`, `signIn.emailOtp`, `emailOtp.requestPasswordReset`, and `emailOtp.resetPassword`. Requests must originate from the configured app origin. No custom OTP database or hashing code is needed. [Better Auth OTP documentation](https://better-auth.com/docs/plugins/email-otp).

### Check delivery

Run `npm run check:email` in the backend folder to validate environment syntax without sending mail. To explicitly send a test email, run `npm run check:email -- your-test-address@yourdomain.com`. A successful response means Resend accepted the request; check **Resend → Emails**, inbox, and spam to confirm delivery. A sending-only key does not need broad account permissions.

The transport throws a safe 503 error for failed delivery, and explicit verification resends expose that safe message. Better Auth intentionally catches background email errors for signup, reset requests, and OTP requests, preserving generic responses; a 200 from those endpoints does not prove email delivery. Failed sends never grant an unverified session. Check the HTTP status logged by the backend and the Resend dashboard for details. Network failures, timeouts, rate limits, and server errors get one bounded retry with the same idempotency key. Permanent errors are not retried. Secrets, recipient addresses, verification URLs, and codes are never included in mail error logs.

## Start both apps

```sh
# Terminal 1
cd Backend-task-expenses-manager
npm run dev

# Terminal 2
cd Frontend-task-expense-manager
npm run dev
```

Open http://localhost:5173. A successful frontend build does not prove that Google consent, email delivery, or live AI credentials are configured correctly; test those after adding your own values.

