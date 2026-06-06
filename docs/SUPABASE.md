# Supabase Setup — Astoria AI Home Match

## Local development (recommended)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) running.

```bash
# Start local Supabase (applies migrations automatically)
npm run supabase:start

# Check status and URLs
npm run supabase:status

# Reset database and re-run migrations
npm run supabase:reset

# Stop when done
npm run supabase:stop
```

### Local URLs

| Service | URL |
|---------|-----|
| **Studio** (database UI) | http://127.0.0.1:54323 |
| **API** | http://127.0.0.1:54321 |
| **Database** | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

`.env.local` is configured for local Supabase. Restart Next.js after changing env:

```bash
npm run dev
```

---

## Production (Supabase Cloud)

1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** → **New query** and run **one** of:
   - **Easiest:** paste and run the full file `supabase/production-setup.sql`
   - **Or** run each migration in order:
     - `supabase/migrations/001_initial.sql`
     - `supabase/migrations/002_phase2_attribution_and_tokens.sql`
     - `supabase/migrations/003_report_source.sql`
     - `supabase/migrations/004_equity_lead_type.sql`
     - `supabase/migrations/005_wealth_forecast_lead_type.sql`
     - `supabase/migrations/006_site_analytics.sql`
     - `supabase/migrations/007_multi_tenant_core.sql`
     - `supabase/migrations/008_demo_tenant.sql`
     - `supabase/migrations/009_tenant_logos_storage.sql`
3. In **Table Editor**, confirm `leads` and `lead_events` exist.
4. Go to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL` in Vercel
   - **Secret** key → `SUPABASE_SERVICE_ROLE_KEY` in Vercel  
   The URL and key must be from **this same project**.
5. Redeploy on Vercel (or wait for the next deploy after env changes).

Or link the CLI and push migrations:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### Error: `Could not find the table 'public.leads'`

This means migrations were never applied to the Supabase project linked in Vercel. Run `supabase/production-setup.sql` in that project's SQL Editor, then submit the quiz again.

### Tenant logo storage setup

Migration `supabase/migrations/009_tenant_logos_storage.sql` creates/updates the `tenant-logos` bucket automatically.

- **Access model:** Public read, server-side write only.
- **Write path:** `POST /api/admin/tenant/logo` with admin auth and tenant resolution.
- **No public write policies:** uploads do not use client-side Supabase writes.
- **Path convention:** `tenant-logos/{tenantSlug}/logo-{timestamp}.{ext}`
- **Allowed MIME types:** `image/png`, `image/jpeg`, `image/webp`
- **Maximum file size:** 2MB

---

## Tables

- **leads** — quiz data, AI reports, scoring, attribution, admin notes
- **lead_events** — audit trail (lead created, status updates)

Row Level Security is enabled with no public access; the Next.js server uses the **service role** key only.
