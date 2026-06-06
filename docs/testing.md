# E2E / Production Testing

Playwright tests validate the full deployment before a pitch. Production runs are **read-only by default** — they do not reset the demo, upload files, or create leads unless you opt in.

## Quick local verification

Run these in order after `npm install`:

```bash
# 1. Schema + lint + build
npm run supabase:verify
npm run check

# 2. Demo data + public safety
npm run check:demo

# 3. AI fixture test (optional, uses OpenAI)
npm run check:ai

# 4. E2E (installs Chromium first via pretest hook)
npm run test:e2e:install
npm run test:local
```

For production E2E, set `E2E_BASE_URL`, passwords, and bypass secret (see below), then:

```bash
npm run test:prod
npm run test:prod:safety
```

## Prerequisites

```bash
npm install
npx playwright install chromium
```

If browser install fails with a sandbox cache path, run:

```bash
env -u PLAYWRIGHT_BROWSERS_PATH npx playwright install chromium
```

Copy E2E variables into `.env.local` (see `.env.example`) or export them in your shell.

| Variable | Purpose |
|---|---|
| `E2E_BASE_URL` | Target deployment (local, preview, or production) |
| `E2E_ADMIN_PASSWORD` | Tenant admin password (`ADMIN_PASSWORD` on target) |
| `E2E_PLATFORM_ADMIN_PASSWORD` | Platform admin password (`PLATFORM_ADMIN_PASSWORD`) |
| `E2E_VERCEL_BYPASS_SECRET` | Vercel Deployment Protection bypass header |
| `E2E_RESET_DEMO` | `true` to POST demo reset (default: `false`) |
| `E2E_TEST_UPLOADS` | `true` to run data room upload test (default: `false`) |
| `E2E_CREATE_LEADS` | `true` to run intake submit test (default: `false`) |

Secrets are never printed in test output.

## Local

Starts (or reuses) `npm run dev` when `E2E_BASE_URL` is unset:

```bash
E2E_BASE_URL=http://localhost:3000 \
E2E_ADMIN_PASSWORD=your-admin-password \
E2E_PLATFORM_ADMIN_PASSWORD=your-platform-password \
npm run test:e2e
```

## Production (read-only smoke)

Ensure a Mercer demo lead exists (`npm run demo:mercer` against production Supabase/env first).

```bash
E2E_BASE_URL=https://ai-private-client-xqlve2j3u-sim-d.vercel.app \
E2E_PLATFORM_ADMIN_PASSWORD=... \
E2E_ADMIN_PASSWORD=... \
E2E_VERCEL_BYPASS_SECRET=... \
npm run test:prod
```

### Headed (watch the browser)

```bash
E2E_BASE_URL=https://ai-private-client-xqlve2j3u-sim-d.vercel.app \
E2E_PLATFORM_ADMIN_PASSWORD=... \
E2E_ADMIN_PASSWORD=... \
E2E_VERCEL_BYPASS_SECRET=... \
npm run test:prod:headed
```

### Public safety only

```bash
E2E_BASE_URL=https://ai-private-client-xqlve2j3u-sim-d.vercel.app \
E2E_PLATFORM_ADMIN_PASSWORD=... \
E2E_VERCEL_BYPASS_SECRET=... \
npm run test:prod:safety
```

### Other production suites

- `npm run test:prod:presentation` — slide navigation
- `npm run test:prod:admin` — admin AI tabs
- `npm run test:prod:visual` — screenshots in `test-results/visual-smoke/`

## Vercel Deployment Protection (401)

If tests fail with **401 Unauthorized**:

1. In Vercel → Project → Settings → Deployment Protection, create or copy an **Automation Bypass** secret.
2. Set `E2E_VERCEL_BYPASS_SECRET` (or `VERCEL_AUTOMATION_BYPASS_SECRET`).
3. Re-run tests.

Playwright sends `x-vercel-protection-bypass` on all browser and API requests when this variable is set.

## Optional mutating tests

Only use when you intentionally want side effects:

```bash
# Reset demo before tests
E2E_RESET_DEMO=true npm run test:prod

# Data room upload + summary
E2E_TEST_UPLOADS=true npm run test:e2e tests/e2e/data-room-upload.spec.ts

# Create a new public lead via intake
E2E_CREATE_LEADS=true npm run test:e2e tests/e2e/public-submit-async.spec.ts
```

## Reports

```bash
npm run test:e2e:report
```

HTML report opens traces, screenshots, and video on failure.
