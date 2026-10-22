# Edith — AI-Powered Project & Expense Management

**One workspace to plan projects, manage tasks, track project finances, and turn everyday inputs into actionable drafts with AI.**

Edith connects project delivery with financial visibility. Users can organize work, record expenses and revenue, monitor budgets and profit, and ask **Ultron**, the built-in AI assistant, questions about their workspace. It is a full-stack application built with React, TypeScript, Node.js, Express, MongoDB, and Google Gemini.

[Features](#key-features) · [Technology stack](#technology-stack) · [Engineering highlights](#engineering-highlights) · [Local setup](#start-locally) · [Testing](#testing)

## Key features

| Capability               | What users can do                                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Project management**   | Organize projects by client, status, due date, budget, and optional recorded revenue.                                                                                                      |
| **Task planning**        | Manage priorities and deadlines in list or board views; generate task drafts from a project brief.                                                                                         |
| **Expense tracking**     | Record categorized expenses, link them to projects, mark billable items, and edit records directly from the expense list.                                                                  |
| **Financial insights**   | Compare spending with budgets, track recorded revenue, and calculate profit or loss for projects with revenue data.                                                                        |
| **Reports and exports**  | Filter by project and date, inspect spending trends, and export summaries plus every matching project, task, and expense to CSV.                                                           |
| **Ultron AI assistant**  | Draft expenses from natural language, extract details from receipts and documents, and answer questions using authorized workspace data.                                                   |
| **Authentication**       | Use email/password or Google sign-in, verify email addresses, and recover accounts through Better Auth and Resend. Email OTP endpoints support verification, sign-in, and password resets. |
| **Responsive interface** | Work across mobile, tablet, and desktop with light/dark themes, charts, animations, and a draggable assistant.                                                                             |

## Technology stack

| Layer                       | Technologies                                                            | Role                                                                    |
| --------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Frontend**                | React 19, TypeScript 5, React Router 7                                  | Typed components, client-side navigation, and protected workspace views |
| **Build and styling**       | Vite 7, Tailwind CSS 4, custom CSS                                      | Development tooling, production bundles, and responsive layouts         |
| **Charts and interaction**  | Recharts 3, Motion, Lucide React                                        | Financial charts, transitions, and interface icons                      |
| **Backend**                 | Node.js, Express 5, JavaScript ES modules                               | REST API, authentication handlers, and server-side integrations         |
| **Database**                | MongoDB, Mongoose 8                                                     | Account-scoped records, validation, aggregation, and AI usage tracking  |
| **Authentication**          | Better Auth, Google OAuth                                               | Database-backed sessions, verification, OTP, and password recovery      |
| **Artificial intelligence** | Google Gemini, AI SDK, Zod                                              | Structured generation, document extraction, and read-only tool calling  |
| **Transactional email**     | Resend HTTPS API, native Fetch                                          | Verification, reset, and OTP emails without SMTP connections            |
| **Quality and testing**     | Node.js test runner, Supertest, MongoDB Memory Server, ESLint, Prettier | Automated behavior checks, isolated API tests, linting, and formatting  |

## Engineering highlights

- **Authorization enforced by the API.** Database operations scope records to the authenticated user. Project relationships are checked before linking tasks or expenses, preventing cross-account references.
- **Financial calculations stay deterministic.** Monetary values use integer minor units. MongoDB computes totals, while recorded revenue is distinguished from missing revenue so unknown income does not become an artificial loss.
- **AI produces reviewable drafts.** Gemini responses for planning and expense extraction follow Zod schemas. Workspace questions use a read-only tool; AI output does not automatically modify records.
- **Usage and failures are handled explicitly.** AI requests reserve a monthly allowance, have a timeout, and restore the allowance after generation failures. Email delivery uses bounded retries and idempotency keys to avoid duplicate sends during retries.
- **Session and input protections are built in.** Better Auth manages HttpOnly session cookies, verification, and reset flows. The API validates inputs, enforces allowed origins, and applies rate limits. OTPs are stored hashed and have expiry and attempt limits.
- **Reports preserve complete results.** Aggregates and CSV exports include matching records beyond the first page. Exported text is escaped to reduce spreadsheet formula injection risks.
- **The implementation stays approachable.** React Context handles shared workspace state; Express routes, Mongoose models, and small library modules keep feature logic easy to follow. Report charts load on demand, and motion respects the user's reduced-motion preference.

## How Ultron works

| Workflow               | Input                                           | Result                                                              |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| **Plan a project**     | A project brief                                 | A summary and structured task drafts with priorities                |
| **Capture an expense** | A plain-language description                    | An editable expense draft with amount, category, merchant, and date |
| **Read a document**    | A receipt image, PDF, or DOCX file              | Extracted expense details for user review                           |
| **Ask the workspace**  | A question about budgets, spending, or progress | A Markdown answer based on a server-authorized workspace snapshot   |

Requests pass through session checks, input validation, and usage limits before reaching Gemini. The database supplies financial totals; the model explains the available data. Users review generated drafts before saving them. Provider keys remain on the backend.

## Project structure

```text
Backend/
  server.js             # Startup, database connection, and shutdown
  app.js                # Express middleware and route mounting
  models/               # Projects, tasks, expenses, workspace settings, AI usage
  routes/api.js         # CRUD, reporting, and CSV exports
  routes/ai.js          # Gemini workflows and read-only workspace tool
  middleware/auth.js    # Session checks and trusted client IP handling
  lib/                  # Auth, email, validation, aggregation, and document parsing
  scripts/              # Environment setup, mail check, and legacy migration
  tests/                # Unit and integration tests

Frontend/
  src/App.tsx           # Routes and protected workspace
  src/pages/            # Landing, authentication, and workspace screens
  src/components/       # Shared UI, forms, navigation, charts, and Ultron
  src/lib/              # API client, types, report helpers, and workspace state
  src/*.css             # Shared styles, themes, and responsive rules
  public/               # Brand assets
```

## Documentation

- [Local setup](#start-locally)
- [Environment variables and database troubleshooting](#environment-variables)
- [Google sign-in](#google-sign-in)
- [Resend email and OTP](#email-resend-https-api)
- [Gemini configuration and upload limits](#ultron-ai)
- [Currency and reporting rules](#currency-and-date-filters)
- [Testing](#testing)
- [Existing-account migration](#existing-accounts)

## Start locally

Requires **Node.js 24** (recommended) and **MongoDB**, either locally or through Atlas.

1. From the repository root, install the locked dependencies and create the backend environment:

   ```sh
   npm --prefix Backend ci
   npm --prefix Frontend ci
   npm --prefix Backend run setup
   ```

   The setup command creates an ignored `Backend/.env` with a random auth secret. Existing environment files are never overwritten. For Atlas, replace the default local `MONGO_URI` with your database connection string. See [Environment variables](#environment-variables).

2. Start the API in one terminal:

   ```sh
   npm --prefix Backend run dev
   ```

3. Start the frontend in a second terminal:

   ```sh
   npm --prefix Frontend run dev
   ```

4. Open **http://localhost:5173**. Vite forwards `/api` requests to Express on port 5000. Use this same hostname for authentication and email links.

**Development preview:** run only the frontend and open `http://localhost:5173/demo` to explore sample data without a database. Preview changes stay in browser storage, and AI responses are labeled samples. This route is available only during Vite development and is excluded from production.

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

Both **http://localhost:5173** and **http://127.0.0.1:5173** are accepted in local development. Login, registration, and password-reset pages automatically move to the hostname in `BETTER_AUTH_URL` (normally `localhost`) before starting authentication. This keeps the Google state cookie and callback on the same host. Sessions belong to that hostname. Production trusts only your explicitly configured origins. Your frontend needs no environment variables with the standard Vite proxy. `Frontend/.env.example` contains optional `VITE_API_ORIGIN`; leave it blank for this setup.

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

Edith sends authentication emails through the Resend HTTPS API. Verification links, password recovery, and OTP delivery share one server-side email transport.

1. Create a [Resend account](https://resend.com), add a domain you own in **Domains**, and publish the DNS records Resend supplies. Wait until the domain is verified. You cannot verify a shared `onrender.com` domain or use a Gmail address as the sender.
2. In **API Keys**, create a **Sending access** key restricted to that sending domain. Keep the key private.
3. Set these variables in `Backend/.env`:

```env
RESEND_API_KEY=re_REPLACE_WITH_YOUR_PRIVATE_KEY
RESEND_FROM_EMAIL="Edith <hello@your-verified-domain.com>"
```

Keep API keys on the backend and never prefix them with `VITE_`. Restart the backend after changing these values. See [Resend's sending API](https://resend.com/docs/api-reference/emails/send-email).

Production startup rejects missing or malformed Resend settings rather than bypassing email verification. For local development, both Resend variables can be omitted; email/password signup then works without verification.

For testing without a domain, use `RESEND_FROM_EMAIL="Edith <onboarding@resend.dev>"` in the backend `.env`. This test sender can only send to your own Resend account email. A verified sending domain is required to send to other users. The sender domain can differ from the application's domain. You choose the sender address on that verified domain; you do not need to create a mailbox just to send. [Resend domain restrictions](https://resend.com/docs/api-reference/errors), [verified domains](https://resend.com/docs/dashboard/domains/introduction).

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

On the password-recovery form, enter the email registered with Edith. If it reports that email delivery is unavailable, check that the running backend has both Resend variables and that the frontend can reach `/api/config`. Restart the backend after changing its environment, then refresh the page.

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

Restart Express after adding the key. Ultron calls Gemini directly using the backend API key. Without a Gemini key, the demo shows labeled sample results and real accounts show that AI is unconfigured. [Google API key guide](https://ai.google.dev/gemini-api/docs/api-key).

Model access, free-tier eligibility, and usage limits depend on your Google project. Stay on an eligible free-tier project if you do not want paid usage. Check [current pricing](https://ai.google.dev/gemini-api/docs/pricing) and your AI Studio quota. Free-tier inputs and outputs may be used to improve Google's products; use sample receipts while testing. Model capabilities: [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite).

Requests are authenticated, limited to 20 per account per calendar month, and have a timeout. Failed generations restore the allowance. Workspace questions use a read-only tool that queries only the signed-in user's data. Totals are computed by MongoDB; the model explains them. Retrieval includes the latest 100 tasks and expenses; aggregate totals include every record.

Scans may contain private information and are sent to Gemini for extraction. PNG, JPEG, and WebP images have a 4 MB limit. PDF and Word (.docx) documents have a 5 MB limit. Word extraction reads text only, with a 20,000-character limit and a 1 MB uncompressed document-XML limit; embedded images are not sent. Export image-only Word documents or legacy `.doc` files to PDF. Original files are not retained. Review amounts, dates, and currency before saving. Currency conversion is manual.

## Currency and date filters

Choose a currency in Settings. The choice is saved per account and used in forms, summaries, AI defaults, and exports. This sets the unit of existing numeric amounts; it does not fetch exchange rates or convert values. Changing currency with existing records requires an explicit acknowledgement.

Date bounds are inclusive calendar dates in UTC. Project/task filters use `createdAt`; expense filters use transaction `date`. Project budget, recorded revenue, and linked-cost figures remain all-time for the projects matching the filters. Full CSV exports include these date rules and applied filters, and quote cells to guard against spreadsheet formulas.

## Testing

Automated checks cover application behavior and failure cases:

| Area                | Coverage                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Authentication      | Verification links, OTP expiry and reuse, attempt limits, password resets, session revocation, and OAuth state cookies  |
| Data access         | User ownership, cross-account access rejection, record validation, and project relationships                            |
| Financial reporting | Integer-cent values, unknown versus recorded revenue, date boundaries, filters, and complete CSV exports                |
| AI and email        | Structured outputs, supported document formats, upload limits, quota recovery, provider failures, and safe mail retries |
| Production routing  | Frontend deep links, API routes, and missing assets                                                                     |

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
