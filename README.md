# Edith — projects, tasks, expenses, and a little AI

**New here? Start with [SETUP.md](SETUP.md): it explains every environment variable and where to get it.** Run `npm run setup` in the backend folder to generate local defaults and your auth secret.

The landing page introduces Edith with a warm editorial design and an interactive project preview. The workspace fills the browser and uses horizontal navigation with compact data cards. Light/dark mode is saved in your browser. **Ultron** is the draggable assistant available throughout the site; there is no separate AI page.

A simple full-stack app built on the original React + Express + MongoDB project. The landing page explains the product; the dashboard connects projects, tasks, spending, and budgets.

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

## Enable Google sign-in

Create a **Web application** OAuth client in [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Add this exact authorized redirect URI:

```text
http://localhost:5173/api/auth/callback/google
```

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the backend `.env`, then restart the backend. Use your own domain callback in production. Provider secrets never go in frontend variables.

Google accounts and email accounts use the same authentication library. Automatic linking of existing accounts is disabled to avoid accidentally granting access to a different sign-in identity.

## Enable email delivery

Set backend-only `RESEND_API_KEY` and `RESEND_FROM_EMAIL` using a verified sending domain. All verification, password-reset, and OTP emails use Resend's HTTPS API, compatible with Render Free. Remove legacy `SMTP_*` variables. Verification is required when configured locally; production refuses to start without valid Resend configuration. Google login and existing accounts remain supported. See [SETUP.md](SETUP.md#email-resend-https-api) for domain verification, environment setup, tests, and OTP endpoints.

## Enable AI

Set these backend variables and restart:

```env
GEMINI_API_KEY=your-private-google-ai-studio-key
GEMINI_MODEL=gemini-3.5-flash-lite
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey). Ultron calls Gemini directly through the AI SDK Google provider; an AI Gateway key is no longer needed. Only `GEMINI_API_KEY` is required; `GEMINI_MODEL` defaults to `gemini-3.5-flash-lite`, which supports image input, structured output, and tool use. Google offers a limited free tier; verify your project's model access and quota. See [SETUP.md](SETUP.md) for the exact steps.

Requests are authenticated, limited to 20 per account per calendar month, and have a timeout. Failed generations restore the allowance. Workspace questions use a read-only tool that queries only the signed-in user's data. Totals are computed by MongoDB; the model explains them. Retrieval includes the latest 100 tasks and expenses; aggregate totals include every record.

Scans may contain private information and are sent to Gemini for extraction. PNG, JPEG, and WebP images have a 4 MB limit. PDF and Word (.docx) documents have a 5 MB limit. Word extraction reads text only, with a 20,000-character limit and a 1 MB uncompressed document-XML limit; embedded images are not sent. Export image-only Word documents or legacy `.doc` files to PDF. Original files are not retained. Review amounts, dates, and currency before saving. Currency conversion is manual.

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

## Existing accounts and deployment

Back up your original database before running `npm run migrate:legacy` in the backend. The optional script preserves original collections, imports accounts into Better Auth, and adds task status and integer-cent expense fields. Bcrypt passwords stay usable. Old JWT sessions are retired. Do not migrate into a database where the same emails have already registered new accounts without resolving ownership first.

For deployment, the Express production server serves the built frontend and `/api` on the **same public origin**. Build the frontend before starting Express. Set `BETTER_AUTH_URL` and `FRONTEND_URL` to that HTTPS origin, `NODE_ENV=production`, and `TRUST_PROXY=1` behind Render's trusted proxy. Put the Google callback on that origin and configure Resend in the backend environment. The original frontend-only Vercel rewrite is not a complete production API proxy.

Live Google consent, Resend inbox delivery, and AI generations require your provider credentials. They cannot be confirmed by a build or simulated tests. Review dependency advisories and run the integration suite before a public production release. Rotate any real provider credentials that were previously placed in `.env.example`; it must contain placeholders only.

### Currency and date filters

Choose a currency in Settings. The choice is saved per account and used in forms, summaries, AI defaults, and exports. This sets the unit of existing numeric amounts; it does not fetch exchange rates or convert values. Changing currency with existing records requires an explicit acknowledgement.

Date bounds are inclusive calendar dates in UTC. Project/task filters use `createdAt`; expense filters use transaction `date`. Project budget, recorded revenue, and linked-cost figures remain all-time for the projects matching the filters. Full CSV exports include these date rules and applied filters, and quote cells to guard against spreadsheet formulas.
