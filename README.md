# Edith — projects, tasks, expenses, and a little AI

**Start with [local setup](#start-locally).** This README covers environment variables, Google login, Resend email, Ultron AI, troubleshooting, and deployment. Run `npm run setup` in the backend folder to generate local defaults and your auth secret.

The landing page introduces Edith with a warm editorial design and an interactive project preview. The workspace fills the browser and uses horizontal navigation with compact data cards. Light/dark mode is saved in your browser. **Ultron** is the draggable assistant available throughout the site; there is no separate AI page.

A simple full-stack app built on the original React + Express + MongoDB project. The landing page explains the product; the dashboard connects projects, tasks, spending, and budgets.

## Contents

- [Features](#what-is-included)
- [Local setup](#start-locally)
- [Environment variables and MongoDB troubleshooting](#environment-variables)
- [Google sign-in](#google-sign-in)
- [Resend email and OTP](#email-resend-https-api)
- [Ultron AI](#ultron-ai)
- [Currency and date filters](#currency-and-date-filters)
- [Project structure](#beginner-friendly-structure)
- [Checks](#checks)
- [Existing accounts](#existing-accounts)
- [Production deployment](#production-deployment)

## What is included

- Animated, responsive landing page with a browser-only sample workspace.
- Email/password and Google sign-in with Better Auth, HttpOnly session cookies, server-side sign-out, password recovery, and email verification.
- Projects with clients, due dates, budgets, and optional recorded revenue.
- Tasks with priorities, due dates, status, and list/board views.
- Expenses linked to projects, category filters, budget alerts, reports, and CSV export. Overview and Reports have project filters. Date ranges cover project/task creation and expense transaction dates across Overview, Projects, Tasks, Expenses, and Reports. Full report CSV exports include a summary, project finances, every matching task, and every matching expense (not just the first page). Revenue and profit/loss use all-time linked expenses for matching projects with recorded revenue. Expense totals and category summaries follow all active filters.
- AI task planning, receipt/document extraction, natural-language expense drafts, and private workspace questions with readable Markdown answers. Review drafts before saving.

The first version is deliberately personal: one workspace per account, a selectable currency (USD, INR, EUR, GBP, CAD, AUD, SGD, AED), no billing, team invitations, microservices, or complex state libraries. Receipt images are processed for extraction and are not stored.

## Start locally

Requires Node.js 22+ and MongoDB (local or Atlas).

1. Install dependencies in both folders:

   ```sh
   cd Backend-task-expenses-manager
   npm install
   cd ../Frontend-task-expense-manager
   npm install
   ```

2. Run `npm run setup` in the backend folder to create `.env` with a generated secret. Local defaults are:

   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/edith
   BETTER_AUTH_SECRET=your-random-secret-at-least-32-characters-long
   BETTER_AUTH_URL=http://localhost:5173
   FRONTEND_URL=http://localhost:5173
   ```

   Generate a real secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Never commit `.env`.

3. Start the backend in one terminal:

   ```sh
   cd Backend-task-expenses-manager
   npm run dev
   ```

4. Start the frontend in another:

   ```sh
   cd Frontend-task-expense-manager
   npm run dev
   ```

5. Open **http://localhost:5173**. Vite forwards `/api` to port 5000. Use this same hostname for OAuth and email links.

Public demo links have been removed. The `/demo` route exists only during local Vite development for UI testing; it is excluded from production. To test without a database, start just the frontend and open `/demo`. Sample changes stay in browser storage. Demo AI outputs are clearly labeled samples; they do not call a model.

## Environment variables

All provider keys and auth secrets belong in the backend environment. `npm run setup` never overwrites an existing `.env`. Keep `.env` private; `.env.example` contains blank provider values only.

### Required for saving your own work

| Variable             | Where to get it                                                          | What to do                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MONGO_URI`          | MongoDB installed locally, or [MongoDB Atlas](https://cloud.mongodb.com) | Local MongoDB: leave `mongodb://127.0.0.1:27017/edith`. Atlas: create a cluster, create a **database user**, add your current IP in Network Access, select **Connect → Drivers → Node.js**, and copy the URI. Replace the password placeholder with that database user's password and put `edith` after the hostname's `/`. URL-encode special characters in the password. |
| `BETTER_AUTH_SECRET` | Your computer                                                            | `npm run setup` generates this automatically. To generate manually: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. It must stay private and stable between server restarts.                                                                                                                                                                   |

Atlas database users are separate from your Atlas website login. [Official connection guide](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/).

### MongoDB connection errors

`querySrv ECONNREFUSED` means Node could not resolve the Atlas DNS record, before database authentication. On affected Windows installations, Node reports only loopback DNS (`127.0.0.1` or `::1`). Edith detects this case for `mongodb+srv://` connections and uses Cloudflare (`1.1.1.1`) and Google (`8.8.8.8`) DNS in the backend process. Your Windows network settings are not changed.

Restart the backend with `npm run dev`. If the DNS error persists, check that the cluster is active and copy its hostname again from Atlas **Connect → Drivers**. Networks that block public DNS can use the standard `mongodb://` connection string provided by Atlas: disable the **SRV Connection String** toggle in the Connect dialog and copy the entire generated URI. Do not just remove `+srv` from your existing URI. See [Atlas connection troubleshooting](https://www.mongodb.com/docs/atlas/troubleshoot-connection/).

After DNS works, a different connection error may require adding your current IP under **Network Access**, or checking the **database user's** username/password. Add your own IP rather than allowing every address.

### Local defaults: no account or key needed

| Variable          | Value locally           | Meaning                                                                                |
| ----------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| `PORT`            | `5000`                  | Express API port. Keep it aligned with the Vite proxy.                                 |
| `BETTER_AUTH_URL` | `http://localhost:5173` | Public origin used for auth and Google callbacks.                                      |
| `FRONTEND_URL`    | `http://localhost:5173` | Allowed browser origin and email-link destination.                                     |
| `TRUST_PROXY`     | `0`                     | Keep off locally. Hosting only: set `1` if one trusted proxy sits in front of Express. |

Both **http://localhost:5173** and **http://127.0.0.1:5173** are accepted in local development. Login, registration, and password-reset pages automatically move to the hostname in `BETTER_AUTH_URL` (normally `localhost`) before starting authentication. This keeps the Google state cookie and callback on the same host. Sessions belong to that hostname. Production trusts only your explicitly configured origins. Your frontend needs no environment variables with the standard Vite proxy. `Frontend-task-expense-manager/.env.example` contains optional `VITE_API_ORIGIN`; leave it blank for this setup.

## Google sign-in

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

Google accounts and email accounts use the same authentication library. Automatic linking of existing accounts is disabled to avoid accidentally granting access to a different sign-in identity.

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

For testing without a domain, use `RESEND_FROM_EMAIL="Edith <onboarding@resend.dev>"` in the backend `.env`. This test sender can only send to your own Resend account email. A verified sending domain is required to send to other users. The sender domain can differ from the app's Render domain. You choose the sender address on that verified domain; you do not need to create a mailbox just to send. [Resend domain restrictions](https://resend.com/docs/api-reference/errors), [verified domains](https://resend.com/docs/dashboard/domains/introduction).

The login/register screens still support verification links and resending; password recovery still uses a single-use link. Verification links expire in 1 hour; reset links expire in 30 minutes. Existing accounts, passwords, Google login, and sessions remain supported. Password resets revoke existing sessions.

### OTP API

Better Auth's email OTP plugin is available through the existing `/api/auth` handler and the shared frontend `authClient`. Codes are 6 digits, expire after 5 minutes, are stored hashed, allow 3 failed attempts, and are single-use. Sending/verification endpoints are rate-limited. OTP does not automatically create accounts or send a second code on signup; existing verification-link screens continue to work.

| Action                      | POST path after `/api/auth`         | JSON body                                                                            |
| --------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------ |
| Send code                   | `/email-otp/send-verification-otp`  | `{ "email": "user@domain.com", "type": "email-verification" }` (or `sign-in`)        |
| Verify email                | `/email-otp/verify-email`           | `{ "email": "user@domain.com", "otp": "123456" }`                                    |
| Sign in with code           | `/sign-in/email-otp`                | `{ "email": "user@domain.com", "otp": "123456" }`                                    |
| Request password reset code | `/email-otp/request-password-reset` | `{ "email": "user@domain.com" }`                                                     |
| Reset password with code    | `/email-otp/reset-password`         | `{ "email": "user@domain.com", "otp": "123456", "password": "new-strong-password" }` |

Use the Better Auth client methods `emailOtp.sendVerificationOtp`, `emailOtp.verifyEmail`, `signIn.emailOtp`, `emailOtp.requestPasswordReset`, and `emailOtp.resetPassword`. Requests must originate from the configured app origin. No custom OTP database or hashing code is needed. [Better Auth OTP documentation](https://better-auth.com/docs/plugins/email-otp).

### Check delivery

Run `npm run check:email` in the backend folder to validate environment syntax without sending mail. To explicitly send a test email, run `npm run check:email -- your-test-address@yourdomain.com`. A successful response means Resend accepted the request; check **Resend → Emails**, inbox, and spam to confirm delivery. A sending-only key does not need broad account permissions.

On the password-recovery form, enter the email registered with Edith. If it reports that email delivery is unavailable, check that the running backend has both Resend variables and that the frontend can reach `/api/config`. Restart locally, or redeploy the Render backend after changing its environment, then refresh the page.

The transport throws a safe 503 error for failed delivery, and explicit verification resends expose that safe message. Better Auth intentionally catches background email errors for signup, reset requests, and OTP requests, preserving generic responses; a 200 from those endpoints does not prove email delivery. Failed sends never grant an unverified session. Check the HTTP status logged by the backend and the Resend dashboard for details. Network failures, timeouts, rate limits, and server errors get one bounded retry with the same idempotency key. Permanent errors are not retried. Secrets, recipient addresses, verification URLs, and codes are never included in mail error logs.

## Ultron AI

| Variable         | Where to get it                                                                                                                                                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY` | Open [Google AI Studio → API keys](https://aistudio.google.com/apikey), sign in, choose **Create API key**, and select or create a Google Cloud project. Copy the key into the backend `.env`. Keep it private. This is separate from your Google login OAuth credentials. |
| `GEMINI_MODEL`   | Optional. Leave `gemini-3.5-flash-lite`, the default. It supports image input, structured output, and function calling. If your project needs another model, copy its exact ID from Google's model documentation; no `google/` prefix is needed.                           |

```env
GEMINI_API_KEY=your-private-google-ai-studio-key
GEMINI_MODEL=gemini-3.5-flash-lite
```

Restart Express after adding the key. Ultron calls Google directly; no Vercel account or AI Gateway key is needed. Old `AI_GATEWAY_` variables are unused and may be removed. Without a Gemini key, the demo shows labeled sample results and real accounts show that AI is unconfigured. [Google API key guide](https://ai.google.dev/gemini-api/docs/api-key).

Model access, free-tier eligibility, and usage limits depend on your Google project. Stay on an eligible free-tier project if you do not want paid usage. Check [current pricing](https://ai.google.dev/gemini-api/docs/pricing) and your AI Studio quota. Free-tier inputs and outputs may be used to improve Google's products; use sample receipts while testing. Model capabilities: [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite).

Requests are authenticated, limited to 20 per account per calendar month, and have a timeout. Failed generations restore the allowance. Workspace questions use a read-only tool that queries only the signed-in user's data. Totals are computed by MongoDB; the model explains them. Retrieval includes the latest 100 tasks and expenses; aggregate totals include every record.

Scans may contain private information and are sent to Gemini for extraction. PNG, JPEG, and WebP images have a 4 MB limit. PDF and Word (.docx) documents have a 5 MB limit. Word extraction reads text only, with a 20,000-character limit and a 1 MB uncompressed document-XML limit; embedded images are not sent. Export image-only Word documents or legacy `.doc` files to PDF. Original files are not retained. Review amounts, dates, and currency before saving. Currency conversion is manual.

## Currency and date filters

Choose a currency in Settings. The choice is saved per account and used in forms, summaries, AI defaults, and exports. This sets the unit of existing numeric amounts; it does not fetch exchange rates or convert values. Changing currency with existing records requires an explicit acknowledgement.

Date bounds are inclusive calendar dates in UTC. Project/task filters use `createdAt`; expense filters use transaction `date`. Project budget, recorded revenue, and linked-cost figures remain all-time for the projects matching the filters. Full CSV exports include these date rules and applied filters, and quote cells to guard against spreadsheet formulas.

## Beginner-friendly structure

```text
Backend-task-expenses-manager/
  server.js             # Database connection and server start
  app.js                # Express setup and error handling
  models/               # Project, Task, Expense, AiUsage
  routes/api.js         # Ordinary CRUD routes and CSV export
  routes/ai.js          # Four assistant endpoints
  middleware/auth.js    # Session check
  lib/                  # Auth, mail, validation, dashboard totals
  tests/                # Validation and isolated API tests
  scripts/              # Environment setup and optional legacy migration

Frontend-task-expense-manager/src/
  App.tsx               # Page routes and login protection
  pages/                # Landing, auth, dashboard, and feature screens
  components/           # Navigation, forms, dialogs, shared cards
  lib/                  # API client, shared types, demo data, context
  index.css             # Shared forms, tables, and dialogs
  edith.css             # Dashboard, dark theme, and Ultron
  landing.css           # Landing page and responsive styles
```

React's built-in Context keeps shared data in sync. There is no Redux or custom service framework. CSS animates the charts, and Motion handles dialog transitions. Three.js is unnecessary for this design.

## Checks

```sh
# Frontend folder
npm run build
npm run lint

# Backend folder
npm run test:unit
npm run test:integration
```

Integration tests start an isolated temporary MongoDB instance and use fake provider results. They do not use a live AI key or send emails. Their first run may download MongoDB. Run them from a normal terminal if your sandbox blocks local sockets or MongoDB processes. `npm test` runs both suites.

## Existing accounts

Back up your original database before running `npm run migrate:legacy` in the backend. The optional script preserves original collections, imports accounts into Better Auth, and adds task status and integer-cent expense fields. Bcrypt passwords stay usable. Old JWT sessions are retired. Do not migrate into a database where the same emails have already registered new accounts without resolving ownership first.

## Production deployment

Deploy both folders together as one Render Node Web Service. Express serves the built frontend and the API on the same HTTPS origin, which keeps authentication cookies and callbacks on one domain. Resend uses HTTPS, so email delivery does not need paid hosting to bypass SMTP restrictions.

1. Push both app folders and their lockfiles to GitHub. Keep private environment files out of Git.
2. Create a MongoDB Atlas database user and copy the connection string, including the database name (for example, `edith`).
3. In Render, create a **Web Service**, connect the repository, select Node, and leave **Root Directory** blank. Use these commands from the repository root.

   **Build command:**

   ```sh
   npm --prefix Backend-task-expenses-manager ci --omit=dev && npm --prefix Frontend-task-expense-manager ci --include=dev && npm --prefix Frontend-task-expense-manager run build
   ```

   **Start command:**

   ```sh
   npm --prefix Backend-task-expenses-manager start
   ```

   Set **Health Check Path** to `/api/health`. Render supplies `PORT` automatically.

4. Add these variables in **Render → Service → Environment**. Replace all placeholders and use your actual public URL for both origin variables.

   ```env
   NODE_ENV=production
   NODE_VERSION=24
   TRUST_PROXY=1
   MONGO_URI=YOUR_ATLAS_CONNECTION_STRING_WITH_DATABASE_NAME
   BETTER_AUTH_SECRET=YOUR_PRIVATE_RANDOM_SECRET
   BETTER_AUTH_URL=https://YOUR-SERVICE.onrender.com
   FRONTEND_URL=https://YOUR-SERVICE.onrender.com
   RESEND_API_KEY=re_YOUR_PRIVATE_KEY
   RESEND_FROM_EMAIL=Edith <hello@your-verified-domain.com>
   GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
   GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
   GEMINI_API_KEY=YOUR_GEMINI_KEY
   ```

   Google and Gemini credentials are optional if those features are disabled. Both Resend values are required in production. Generate the auth secret using the command in [Environment variables](#environment-variables), and keep an existing production secret stable. In the Render dashboard, enter values without surrounding quotes. Leave `VITE_API_ORIGIN` unset for this single-service setup.

5. In Render, open **Connect → Outbound** and add all listed IP ranges to Atlas **Network Access → IP Access List**.
6. Configure Google OAuth with your public HTTPS origin and the exact redirect URI `https://YOUR-SERVICE.onrender.com/api/auth/callback/google`. Add test users while the consent screen is in testing, or publish it for public access and complete any verification Google requires. Verify the Resend sender domain as described in [Email](#email-resend-https-api).
7. Deploy or redeploy after saving the environment. Check that `/api/health` returns `{"status":"ok"}`. Test signup verification, Google login, password recovery, AI, currency selection, CSV export, and refreshing an internal route such as `/reports`.

When switching to a custom domain, update both public URL variables and Google's origin/callback settings, then redeploy. The email sender can use a different verified domain from the application's domain.

Live Google consent, inbox delivery, and AI generations require your own provider credentials; builds and simulated tests cannot confirm those integrations. Rotate any real provider credentials previously placed in a shared environment template.

Hosting references: [Render Node deployment](https://render.com/docs/deploy-node-express-app), [Render outbound IP addresses](https://render.com/docs/outbound-ip-addresses), and [Atlas IP access lists](https://www.mongodb.com/docs/atlas/security/ip-access-list/).
