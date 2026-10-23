# Edith — AI-Powered Project & Expense Management

**Plan the work. Understand the numbers. Ask Ultron.**

Edith brings projects, tasks, expenses, and financial reporting into one responsive workspace. Its AI assistant, **Ultron**, turns briefs into task drafts, extracts expense details from documents, and answers questions using the signed-in user's workspace data.

[Live application](https://edith-ai-powered-manager.vercel.app) · [Features](#features) · [Technology stack](#technology-stack) · [Local development](#local-development) · [Testing](#testing)

## Features

| Capability               | What it delivers                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Project management**   | Client details, deadlines, status, budgets, and optional recorded revenue.                                                           |
| **Task planning**        | Priorities, due dates, list and board views, and AI-generated task drafts.                                                           |
| **Expense tracking**     | Categorized, billable expenses linked to projects, with editing from the expense list.                                               |
| **Financial visibility** | Budget health, recorded revenue, and project profit or loss when revenue is available.                                               |
| **Reports and exports**  | Project and date filters, spending charts, and complete CSV exports of summaries, projects, tasks, and expenses.                     |
| **Ultron AI**            | Natural-language expense capture, receipt and document extraction, and workspace questions with Markdown answers.                    |
| **Clerk authentication** | Managed sign-in, registration, email verification, password recovery, and account settings. Sign-in methods are configured in Clerk. |
| **Personal workspace**   | Eight currency options, persistent preferences, light/dark themes, and layouts for mobile, tablet, and desktop.                      |

## Technology stack

| Layer              | Technologies                                                            |
| ------------------ | ----------------------------------------------------------------------- |
| **Frontend**       | React 19, TypeScript, React Router, Vite                                |
| **Interface**      | Tailwind CSS, custom CSS, Recharts, Motion, Lucide React                |
| **Backend**        | Node.js, Express 5, JavaScript ES modules                               |
| **Database**       | MongoDB, Mongoose                                                       |
| **Authentication** | Clerk React and Express SDKs                                            |
| **AI**             | Google Gemini, AI SDK, Zod                                              |
| **Quality**        | Node.js test runner, Supertest, MongoDB Memory Server, ESLint, Prettier |

## Engineering highlights

- **Authorization lives on the server.** Clerk verifies session tokens before the API resolves a MongoDB owner. Database queries and linked project checks enforce account boundaries.
- **Money uses integer minor units.** Aggregations produce financial totals. Missing revenue remains distinct from recorded zero revenue, preventing misleading profit or loss figures.
- **AI creates drafts users can review.** Planning and extraction use structured schemas. Workspace questions have a read-only tool; answers cannot silently change records.
- **Failure handling is explicit.** AI requests reserve a monthly allowance, time out, and refund the allowance after provider failures. API validation, origin checks, and rate limits protect write operations.
- **Exports include complete results.** Reports and CSV exports include matching records beyond the first page. CSV cells are escaped to reduce spreadsheet formula injection risks.
- **The structure stays approachable.** React Context shares workspace state. Small Express routes, Mongoose models, and library modules keep responsibilities visible. Report charts load on demand, and animations respect reduced-motion preferences.

## How Ultron works

| Workflow               | Input                           | Result                                       |
| ---------------------- | ------------------------------- | -------------------------------------------- |
| **Plan a project**     | Project brief                   | Summary and task drafts with priorities      |
| **Capture an expense** | Plain-language description      | Editable expense details                     |
| **Scan a document**    | Receipt image, PDF, or DOCX     | Extracted expense draft for review           |
| **Ask the workspace**  | Question about work or finances | Answer grounded in authorized workspace data |

The API checks identity, validates input, and reserves usage before calling Gemini. MongoDB supplies financial totals; the model explains the available data. Provider secrets remain on the backend.

## Project structure

```text
Backend/
  server.js             # Startup, MongoDB connection, graceful shutdown
  app.js                # Express middleware and route mounting
  middleware/auth.js    # Verified Clerk identity → MongoDB owner
  models/               # Account mapping, projects, tasks, expenses, settings, AI usage
  routes/               # CRUD, reports, CSV exports, Gemini workflows
  lib/                  # Validation, filters, aggregation, document parsing
  scripts/              # Environment setup and explicit account linking
  tests/                # Security, unit, and API integration checks

Frontend/
  src/main.tsx          # Clerk provider and shared theme variables
  src/App.tsx           # Public pages and protected workspace routes
  src/pages/            # Landing, Clerk sign-in/sign-up, workspace screens
  src/components/       # Shared UI, forms, charts, navigation, Ultron
  src/lib/              # Authenticated API client, types, reporting helpers, state
  public/               # Brand assets
```

## Local development

Requires **Node.js 24**, a **Clerk application**, and **MongoDB** locally or through Atlas.

1. Install locked dependencies and create the backend environment:

   ```sh
   npm --prefix Backend ci
   npm --prefix Frontend ci
   npm --prefix Backend run setup
   ```

   Existing environment files are never overwritten. Copy `Frontend/.env.example` to `Frontend/.env` as well.

2. Create an application in the [Clerk Dashboard](https://dashboard.clerk.com). Configure email/password or email-code sign-in under **User & authentication**. Enable Google under **SSO connections** if desired. Clerk's prebuilt screens follow these settings and handle verification and recovery; Edith does not send authentication email itself.

3. Open **API Keys** in Clerk. Set `VITE_CLERK_PUBLISHABLE_KEY` in the frontend and `CLERK_PUBLISHABLE_KEY` plus `CLERK_SECRET_KEY` in the backend. All three must belong to the same Clerk instance. Use development keys locally. Follow [Clerk's production setup](https://clerk.com/docs/guides/development/deployment/production) when configuring a production instance.

4. Set the database connection, then start the API and frontend in separate terminals:

   ```sh
   npm --prefix Backend run dev
   ```

   ```sh
   npm --prefix Frontend run dev
   ```

5. Open **http://localhost:5173**. Vite proxies `/api` to Express on port 5000. Requests and CSV downloads include a Clerk session bearer token, which Express verifies. Restart the affected process after changing environment variables.

The landing page remains available without a Clerk key; account pages display a setup notice until configured. A sample workspace is available at `/demo` during development after Clerk is configured. Its changes stay in browser storage and its AI responses are labeled samples.

## Environment variables

Commit only blank example keys. Keep `.env` files ignored. The Clerk publishable key is public; the Clerk secret key, MongoDB connection string, and Gemini key belong only on the backend.

| Location | Variable                     | Purpose                                                                   |
| -------- | ---------------------------- | ------------------------------------------------------------------------- |
| Backend  | `MONGO_URI`                  | Local MongoDB URI or Atlas **Connect → Drivers** connection string.       |
| Backend  | `CLERK_PUBLISHABLE_KEY`      | Publishable key from Clerk's **API Keys** page.                           |
| Backend  | `CLERK_SECRET_KEY`           | Private secret key from the same Clerk instance.                          |
| Frontend | `VITE_CLERK_PUBLISHABLE_KEY` | The matching public Clerk key.                                            |
| Backend  | `FRONTEND_URL`               | Exact allowed browser origin; locally `http://localhost:5173`.            |
| Backend  | `PORT`                       | API port; defaults to `5000`.                                             |
| Backend  | `TRUST_PROXY`                | `0` locally; set `1` only when one trusted reverse proxy fronts Express.  |
| Backend  | `GEMINI_API_KEY`             | Optional key from [Google AI Studio](https://aistudio.google.com/apikey). |
| Backend  | `GEMINI_MODEL`               | Optional model override; defaults to `gemini-3.5-flash-lite`.             |

Google connections, email verification, recovery, and authentication email delivery are configured in Clerk. The former application-managed SMTP, Resend, Google OAuth credentials, and auth-secret variables are unused and can be removed from your environment. See [Clerk React setup](https://clerk.com/docs/react/getting-started/quickstart) and [Express setup](https://clerk.com/docs/expressjs/getting-started/quickstart).

### MongoDB connection errors

For Atlas, create a database user, add your current IP in **Network Access**, and copy the full driver connection string. URL-encode special characters in the password.

If `querySrv ECONNREFUSED` appears, confirm the Atlas hostname and cluster status. On Windows installations reporting only loopback DNS, the backend uses public resolvers within its own process. Networks that block SRV lookups can use the full standard `mongodb://` URI supplied by Atlas; do not simply remove `+srv` from an existing URI. See [Atlas troubleshooting](https://www.mongodb.com/docs/atlas/troubleshoot-connection/).

## AI and reporting rules

- AI requests are limited to **20 per account per calendar month**. Failed generations restore the allowance. Without a Gemini key, live AI features show a configuration message.
- Receipt images support PNG, JPEG, and WebP up to **4 MB**. PDF and DOCX documents allow **5 MB**. DOCX extraction reads text only, limited to 20,000 characters and 1 MB of document XML; embedded images are excluded. Export legacy `.doc` files to PDF.
- Files are sent to Gemini for extraction and are not retained by Edith. Review extracted amounts, dates, and currency before saving. Provider access and limits depend on your Google project.
- Currency settings label existing numeric values; they do not apply exchange rates. Changes with existing records require acknowledgement.
- Date filters use inclusive UTC calendar dates. Projects and tasks use creation dates; expenses use transaction dates. Budget, revenue, and linked-cost figures stay all-time for matching projects.

## Testing

```sh
npm --prefix Frontend run build
npm --prefix Frontend run lint
npm --prefix Backend run test:unit
npm --prefix Backend run test:integration
```

Tests cover signed Clerk token verification, missing/forged/expired/wrong-origin credentials, owner mapping, account isolation, CRUD relationships, integer-cent calculations, filters, complete exports, upload limits, AI failures, and production routing.

Authentication fixtures sign temporary test tokens that the real Clerk Express middleware verifies with a local public key. Integration tests start an isolated MongoDB instance and use fake AI results. They do not use real Clerk users or live provider credentials. The first integration run may download MongoDB; the environment must allow local sockets and MongoDB processes. Live verification emails, social sign-in, recovery, and account settings should also be checked against your configured Clerk instance.

## Existing accounts

Clerk creates new identities and sessions. Existing application passwords and sessions do not migrate automatically. Users must register with Clerk or use an enabled sign-in method. Existing workspace records are retained in MongoDB; accounts are never automatically linked by a browser-supplied email.

To reconnect an existing workspace, back up the database and stop the API during the one-time administrative operation. Find the old user's `_id` in `auth_users` and the new user ID in the Clerk Dashboard, then run:

```sh
npm --prefix Backend run link:account -- <old-MongoDB-user-ID> <Clerk-user-ID>
```

The command checks that the old account email matches the verified primary Clerk email. It refuses to replace an account with existing workspace activity or claim a workspace already linked to someone else. Restart the API and sign in again. Projects, tasks, expenses, currency settings, and AI usage keep their original owner. No database migration or account linking runs automatically on startup.
