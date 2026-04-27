# WeightLock

**Put money behind your goals.**

WeightLock is a behavioral commitment contract app for weight loss. A participant deposits money into a contract, and that money is released according to rules tied to adherence and outcomes. A referee verifies weigh-ins and earns money when the participant stays consistent.

Both sides have skin in the game. Real stakes. Real accountability.

## Core Concept

1. **Participant** deposits funds (default $1,000) into a contract
2. Funds are split across four pools: weekly compliance, milestones, penalties, and completion
3. **Referee** verifies weigh-ins (3x/week for 16 weeks)
4. Compliant weeks release $30 to the referee from the weekly pool
5. Noncompliant weeks release $5 from the penalty pool
6. Every 5 lb lost triggers a $25 milestone payout (+ $25 bonus at 10 lb intervals)
7. Reaching the full 40 lb goal releases the $240 completion bonus

## Architecture

Two frontends, one backend:

```
mobile/                          (React Native / Expo)
├── Participant-focused mobile app
├── Camera integration for scale photos
├── Push notifications for weigh-in reminders
├── Secure token storage
└── Same Supabase backend

src/                             (Next.js 15 / Web)
├── Marketing landing page
├── Referee verification portal
├── Admin/dashboard web access
├── Stripe checkout flows
├── Cron jobs for automated evaluation
└── Same Supabase backend

Shared Backend:
├── Database: Supabase (Postgres + Auth + Storage + RLS)
├── Payments: Stripe (Checkout + Connect + Webhooks)
├── Email: Resend
├── Cron: Vercel Cron Jobs
└── Testing: Vitest
```

### Key directories

```
src/
├── app/                    # Next.js pages and API routes
│   ├── api/cron/           # Weekly evaluation, milestone, completion cron jobs
│   ├── api/stripe/         # Checkout, success, webhooks
│   ├── api/webhooks/       # Stripe webhook handler
│   ├── contracts/          # Contract CRUD, weigh-in, wallet, history
│   ├── dashboard/          # Main dashboard
│   ├── referee/            # Referee verification panel
│   └── accept-invite/      # Referee invite acceptance
├── components/             # React components (UI + domain)
├── lib/
│   ├── actions/            # Server actions (auth, contracts, weigh-ins, invites)
│   ├── engines/            # Rule engines (weekly eval, milestones, completion, pool tracker)
│   ├── supabase/           # Supabase client/server/middleware
│   ├── notifications.ts    # Resend email templates
│   ├── stripe.ts           # Stripe integration
│   ├── validations.ts      # Zod schemas
│   └── utils.ts            # Utility functions
└── types/                  # TypeScript type definitions

supabase/
└── migrations/             # SQL migration files

tests/                      # Vitest test suite
scripts/                    # Seed data

mobile/                     # React Native (Expo) app
├── app/                    # Expo Router screens
│   ├── login.tsx           # Magic link auth
│   ├── dashboard.tsx       # Contract list
│   ├── contract/new.tsx    # Contract creation
│   ├── contract/[id]/      # Detail, weigh-in, wallet, history
│   └── referee.tsx         # Verification panel
├── lib/                    # Supabase client, auth context, utils
├── components/             # Shared components
└── constants/              # Theme tokens
```

## Mobile App (React Native / Expo)

The mobile app is the primary interface for participants. It provides:

- **Magic link auth** with secure token storage via Expo SecureStore
- **Dashboard** with pull-to-refresh showing all contracts
- **Contract creation** with 2-step wizard (goal + funding)
- **Weigh-in screen** with camera integration for scale photos
- **Contract detail** with progress, milestones, and quick actions
- **Wallet** with pool breakdowns and transaction history
- **Timeline history** of all contract events
- **Referee panel** for approving/rejecting weigh-ins
- **Push notifications** for weigh-in reminders (Expo Notifications)

### Running the mobile app

```bash
cd mobile
cp .env.example .env
# Fill in your Supabase URL and anon key
npm start
# Scan QR code with Expo Go on your phone
```

## Local Setup

### Prerequisites

- Node.js 18+
- A Supabase project
- A Stripe account (test mode)
- A Resend account

### 1. Clone and install

```bash
git clone <repo-url>
cd Weightlock
npm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in all values in `.env.local`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_test_...) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Same as above, for client |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Sender email for notifications |
| `NEXT_PUBLIC_APP_URL` | App URL (http://localhost:3000 for local) |
| `CRON_SECRET` | Random secret to authenticate cron requests |

### 3. Supabase setup

1. Create a new Supabase project
2. Go to SQL Editor and run the migration file:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, indexes, RLS policies, triggers, and the storage bucket.

3. Enable Email auth in Supabase Auth settings
4. Configure the Site URL to `http://localhost:3000`
5. Add `http://localhost:3000/auth/callback` to redirect URLs

### 4. Stripe setup

1. Use Stripe test mode
2. Create a webhook endpoint pointing to `{your-url}/api/webhooks/stripe`
3. Subscribe to events: `checkout.session.completed`, `account.updated`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

For local development, use the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### 5. Resend setup

1. Create a Resend account
2. Add and verify your sending domain
3. Copy the API key to `RESEND_API_KEY`

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. Seed data (optional)

Run the seed SQL against your Supabase database:

```
scripts/seed.sql
```

Note: Seed data uses placeholder UUIDs. For a working demo, create auth users first and update the UUIDs.

## Running Tests

```bash
npm test          # Run all tests once
npm run test:watch  # Watch mode
```

Tests cover:
- Weekly evaluation engine (compliance/noncompliance logic)
- Milestone detection (idempotency, bonus logic, threshold detection)
- Completion check (target matching)
- Pool tracker (balance computation)
- Zod validation schemas (contract creation, weigh-in submission, verification)

## Cron Configuration

Three cron jobs run on Vercel:

| Job | Schedule | Path |
|-----|----------|------|
| Weekly Evaluation | Mondays 6am UTC | `/api/cron/weekly-evaluation` |
| Milestone Detection | Every 4 hours | `/api/cron/milestone-detection` |
| Completion Check | Every 4 hours | `/api/cron/completion-check` |

All cron endpoints require `Authorization: Bearer {CRON_SECRET}`.

Vercel cron is configured in `vercel.json`.

For local testing, call the endpoints directly:

```bash
curl -H "Authorization: Bearer your-cron-secret" http://localhost:3000/api/cron/weekly-evaluation
```

## Deployment to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add all environment variables
4. Deploy

Vercel cron jobs will run automatically based on `vercel.json`.

Make sure to:
- Update `NEXT_PUBLIC_APP_URL` to your production URL
- Configure Stripe webhook for production endpoint
- Verify Supabase redirect URLs include production domain

## Default Money Logic

| Event | Amount | Pool |
|-------|--------|------|
| Compliant week (3+ verified weigh-ins) | $30 → referee | Weekly Pool ($480) |
| Noncompliant week | $5 → referee | Penalty Pool ($80) |
| Every 5 lb milestone | $25 → referee | Milestone Pool ($200) |
| Every 10 lb milestone (bonus) | +$25 → referee | Milestone Pool |
| 40 lb goal reached | $240 → referee | Completion Pool ($240) |

Total deposit: $1,000

## Demo Flow

### Participant

1. Sign up at `/login` with email
2. Create contract at `/contracts/new` (set weight, invite referee)
3. Fund contract via Stripe checkout
4. Log weigh-ins at `/contracts/[id]/weigh-in`
5. Track progress on dashboard
6. View finances at `/contracts/[id]/wallet`

### Referee

1. Receive invite email
2. Accept at `/accept-invite/[token]`
3. Sign in and view `/referee` panel
4. Approve/reject weigh-ins
5. Track earnings

## Important Limitations (MVP)

- **Not regulated escrow**: Funds are managed through platform-controlled payment flows (Stripe Checkout + internal ledger). This is not a licensed escrow service.
- **Photo verification**: Upload infrastructure is scaffolded; UI has placeholder for photo upload.
- **Stripe Connect payouts**: Connect account onboarding is implemented, but actual transfer execution requires additional Stripe configuration.
- **SMS notifications**: Architecture supports adding Twilio later; currently email only via Resend.
- **Single contract per relationship**: No multi-contract management yet.
- **Timezone handling**: Week boundaries use UTC. Production should add timezone configuration.

## Legal / Compliance Note

WeightLock uses the term "locked funds" to describe funds managed through platform-controlled payment flows. **This is not regulated financial escrow.** Funds are collected via Stripe, tracked via an internal ledger, and released via platform-initiated transfers. No licensed escrow, trust, or custodial service is being provided. Users should consult applicable laws before deploying in production.

## Tech Stack

- **Next.js 15+** with App Router
- **TypeScript** with strict mode
- **Tailwind CSS v4** + **shadcn/ui** components
- **Supabase** (Postgres, Auth, Storage, Row-Level Security)
- **Stripe** (Checkout, Connect, Webhooks)
- **Resend** for email notifications
- **Recharts** for weight progress graphs
- **Zod** for input validation
- **Vitest** for testing
- **Vercel** for deployment + cron
