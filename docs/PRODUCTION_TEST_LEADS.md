# Production Test Leads

Use these scripts to create labeled test leads in **production** so you can verify the admin dashboard, AI reports, Lead Concierge, and public result pages without manually completing each quiz.

These leads are for admin dashboard testing only. Delete them after verification.

## Safety guards

Both scripts refuse to run unless:

```bash
PRODUCTION_TEST_SEED_CONFIRM=true
```

The seed script also requires:

```bash
PRODUCTION_SITE_URL=https://your-domain.com
```

The cleanup script additionally requires:

```bash
ADMIN_PASSWORD=your-admin-password
```

## Seed one production seller test lead (enrichment + concierge)

Use this when you want a single realistic **seller** lead through the live API — oceanfront Newport Beach profile, privacy priority, and full property enrichment — without filling out the quiz UI.

### Recommended command

```bash
PRODUCTION_SITE_URL=https://astoria-estates.vercel.app \
PRODUCTION_TEST_SEED_CONFIRM=true \
npm run test:prod-seller
```

Notifications are **suppressed by default** for this script. Set `SUPPRESS_TEST_NOTIFICATIONS=false` only when intentionally testing email delivery.

### Required environment variables

| Variable | Purpose |
| --- | --- |
| `PRODUCTION_SITE_URL` | Production site base URL (no trailing slash) |
| `PRODUCTION_TEST_SEED_CONFIRM=true` | Safety guard — script refuses to run without this |

### Optional environment variables

| Variable | Purpose |
| --- | --- |
| `PRODUCTION_TEST_EMAIL` | Override default `test+seller-production@example.com` |
| `PRODUCTION_TEST_PHONE` | Override default `5555555555` |
| `SUPPRESS_TEST_NOTIFICATIONS` | Omitted or any value except `false` → notifications suppressed (default). Set to `false` only to test real email delivery. |

The script also sends `X-Test-Lead: true` and `X-Suppress-Notifications` headers; notification suppression is enforced via `testMetadata.suppressNotifications` in the request body.

### What to verify

1. Open `/admin` and find **Test Production Seller**
2. Expand the row: Property Intelligence, Lead Concierge, Website Activity (if session events exist)
3. Open the printed result URL — confirm no internal fields, scores, or concierge content on the public page
4. **Delete the test lead** after verification (see cleanup below; add `Production Seller` to your delete filter or remove by lead id)

---

## Seed four production test leads

Creates one lead for each flow:

- buyer
- seller
- equity
- wealth_forecast

Each lead uses clearly labeled test contact info:

- `firstName`: `Test`
- `lastName`: `Buyer Lead`, `Seller Lead`, `Equity Lead`, or `Wealth Lead`
- `email`: `PRODUCTION_TEST_EMAIL` if set, otherwise `test+buyer@example.com`, `test+seller@example.com`, `test+equity@example.com`, `test+wealth@example.com`
- `phone`: `PRODUCTION_TEST_PHONE` if set, otherwise `5555555555`

Each seeded lead still runs the full server pipeline:

- AI report generation
- lead scoring and temperature
- Lead Concierge generation
- Supabase save
- public result token creation

Internal fields remain admin-only. Public result pages still hide internal data.

### Recommended command

```bash
PRODUCTION_SITE_URL=https://your-domain.com \
PRODUCTION_TEST_SEED_CONFIRM=true \
SUPPRESS_TEST_NOTIFICATIONS=true \
npm run seed:prod-leads
```

### Optional environment variables

| Variable | Purpose |
| --- | --- |
| `PRODUCTION_TEST_EMAIL` | Use one shared inbox for all four test leads |
| `PRODUCTION_TEST_PHONE` | Override default `5555555555` |
| `SUPPRESS_TEST_NOTIFICATIONS=true` | Skip Resend email notifications for seeded test leads only |

Use `SUPPRESS_TEST_NOTIFICATIONS=false` only if you intentionally want to test real notification delivery for seeded leads.

Normal real leads always send notifications.

### What the script prints

For each lead:

- lead type
- HTTP status
- lead id
- result token
- result URL
- whether save succeeded
- whether notification was suppressed

## Verify in admin

1. Open `https://your-domain.com/admin`
2. Confirm all four `Test` leads appear
3. Expand each row and verify:
   - AI report summary fields
   - lead score and temperature
   - Lead Concierge section
4. Open each result URL and confirm public pages do **not** expose internal fields

## Cleanup

There is no public delete endpoint. Use the cleanup helper to list matching leads and print SQL:

```bash
PRODUCTION_SITE_URL=https://your-domain.com \
PRODUCTION_TEST_SEED_CONFIRM=true \
ADMIN_PASSWORD=your-admin-password \
npm run seed:prod-leads:cleanup
```

Then run the printed SQL in Supabase SQL Editor:

```sql
delete from public.leads
where first_name = 'Test'
  and last_name in (
    'Buyer Lead',
    'Seller Lead',
    'Equity Lead',
    'Wealth Lead',
    'Production Seller'
  );
```

Related `lead_events` rows are removed automatically via `ON DELETE CASCADE`.

## Test metadata stored in production

Seeded leads include this metadata in `quiz_data`:

- `isTestLead: true`
- `testSeededAt`: ISO timestamp
- `testSource: "production_seed_script"`

This metadata is admin-only and is not returned by public result endpoints.

## Tenant verification SQL

Use this in Supabase SQL Editor to verify tenant assignment and isolation:

```sql
select
  l.id,
  l.first_name,
  l.last_name,
  l.lead_type,
  t.slug,
  t.brand_name
from public.leads l
join public.tenants t on t.id = l.tenant_id
order by l.created_at desc
limit 20;
```
