# Astoria AI Home Match

Premium AI-powered luxury real estate lead generation app for **Astoria Luxury Estates** (California only).

## Features

- Premium landing page with buyer/seller paths
- One-question-per-screen buyer and seller quizzes
- OpenAI structured report generation with Zod validation
- Deterministic lead scoring (0–100) with temperature labels
- Supabase lead storage with RLS (server-only access)
- Internal admin dashboard at `/admin`

## Tech Stack

- Next.js App Router · TypeScript · Tailwind CSS
- Framer Motion · Zod · React Hook Form patterns
- Supabase · OpenAI (server-side only)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Supabase database

**Local (Docker):**

```bash
npm run supabase:start   # starts DB + applies migrations
npm run dev
```

Studio: http://127.0.0.1:54323

See [docs/SUPABASE.md](docs/SUPABASE.md) for cloud setup and commands.

### 4. Run locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/buyer` | Buyer quiz |
| `/seller` | Seller quiz |
| `/result` | AI report results |
| `/thank-you` | Post-report thank you |
| `/admin` | Internal lead dashboard |

## API

- `POST /api/leads` — Submit quiz, generate AI report, score & save lead (returns `leadId` + `token`)
- `GET /api/leads/result/[token]` — Public report by secure token (no internal fields)
- `GET /api/admin/leads` — List leads (Bearer `ADMIN_PASSWORD`)
- `PATCH /api/admin/leads` — Update lead status and/or admin notes

## Phase 2 Features

- **Secure result tokens** — Reports load via `/result?token=...` (no sessionStorage)
- **UTM / attribution capture** — First-touch stored in localStorage, saved on lead submit
- **Conversion tracking** — Provider-neutral hooks (`trackPageView`, `trackQuizStarted`, etc.)
- **Email notifications** — Resend (optional, non-blocking)
- **SMS placeholder** — Hot leads log SMS intent (`lib/notifications/sms.ts`)
- **Booking URL** — `NEXT_PUBLIC_BOOKING_URL` for consultation CTAs
- **Admin dashboard** — Filter, search, sort, CSV export, copy follow-up, admin notes
- **Spam protection** — Honeypot field + in-memory IP rate limiting

## Prompt testing (no UI)

```bash
npm run ai:test -- buyer.irvine.townhome
npm run ai:test -- buyer.newport.luxury
npm run ai:test -- seller.costa.mesa

# Optional: save a test lead to Supabase
npm run ai:test -- buyer.irvine.townhome save
```

Fixtures live in `scripts/fixtures/`. Reports are generated via `src/lib/ai/generateReport.ts` without touching the quiz UI.

Apply `supabase/migrations/002_phase2_attribution_and_tokens.sql` in Supabase SQL editor.

## Lead Scoring

Deterministic scoring (not AI-based). Buyer and seller rubrics defined in `src/lib/scoring.ts`.

- **Cold:** 0–39
- **Warm:** 40–69
- **Hot:** 70–100

## Compliance

AI reports include a mandatory disclaimer. The app does not provide valuations, guarantees, or fair-housing-sensitive steering. Out-of-state users see a referral message.

## License

Private — Astoria Luxury Estates.
