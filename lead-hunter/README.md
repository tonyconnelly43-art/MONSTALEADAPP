# MONSTA Lead Hunter

Finds and qualifies home-service businesses (HVAC, plumbing, garage doors, electrical, roofing, landscaping, plus custom industries) that could benefit from Monsta Media & Design's branding, logo, vehicle-wrap and website work.

Next.js (App Router) + TypeScript + Tailwind, built for Vercel. It is independent of the Vite app at the repo root.

## Run locally

```bash
cd lead-hunter
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (dedupe, scoring, outreach gate)
npm run typecheck && npm run lint && npm run build
```

Deploy on Vercel: import the repo and set **Root Directory** to `lead-hunter`.

## Status — Milestone 1 ✅

- Dashboard: KPIs, search panel (city/state/radius/industry/custom industry, results capped at 25), filterable and sortable prospect table, mobile card layout.
- Prospect drawer: contact details and source, transparent score breakdown, website findings with evidence and confidence, notes, chain/franchise assessment.
- Pipeline: New → Reviewed → Approved for Outreach → Contacted → Replied → Meeting Booked → Closed, with history. **Contacted and later stages are locked until a prospect is approved.** The app never sends anything.
- Discovery provider interface plus a **fictional sample provider**: no network calls, every record labeled. It includes one intentional duplicate to demonstrate deduplication.
- Deduplication by provider ID, website domain, phone and normalized name + city, applied within each search and against saved prospects.
- Versioned scoring rubric (`/rubric`): brand opportunity 60 + business fit 40. Unknown checks never earn points.
- Storage: browser `localStorage`, behind the `ProspectStore` interface. Data stays in this browser only until Milestone 3.

## Status — Milestone 2 ✅ (waiting on the API key)

- `src/lib/discovery/googlePlaces.ts`: Places API (New) Text Search provider.
  - Field mask limited to the fields we store: name, address, phone, website, category, rating, review count, Maps URL, location, business status.
  - Locates the city center, biases the search to that circle, then **enforces the radius** with a distance check.
  - Skips permanently closed businesses. "All target industries" runs one page per industry and interleaves the results.
- Cost guard:
  - The server refuses billable searches until the user confirms a cost estimate in the UI.
  - `PLACES_DAILY_REQUEST_CAP` (default 20) stops searches once the day's cap is reached.
  - Identical searches and city lookups are cached for 24 hours.
  - The cap and cache live in server memory, so the **Google Cloud quota is the hard limit**.
- Turns on automatically when `GOOGLE_PLACES_API_KEY` is set; until then the option is shown as disabled.
- Tested against a stubbed Google API (`googlePlaces.test.ts`). It has not yet run against live Google data.

### Enabling live search
1. Google Cloud Console: create a project and enable billing.
2. Enable **Places API (New)**.
3. Create an API key. Under *API restrictions* allow only Places API (New).
4. Under *Quotas*, cap the requests per day (e.g. 100).
5. Vercel: add `GOOGLE_PLACES_API_KEY` (and optionally `PLACES_DAILY_REQUEST_CAP`), then redeploy.

Google Maps Platform terms limit how long Places content (anything except place IDs) may be stored. Milestone 3 will store place IDs durably and refresh details from Google rather than keeping them indefinitely.

## Status — Milestone 3 ✅

- **Shared database** (Postgres via Drizzle ORM, `src/lib/db`, `src/lib/repo`). When `DATABASE_URL` is set:
  - Prospects are saved on the server and shared by everyone who signs in.
  - Searches are deduplicated against everything already stored.
  - The outreach approval gate is enforced by the server.
  - The daily Google request cap is counted in the database, so it holds across server instances.
- **Migrations** live in `drizzle/` and run automatically during `npm run build` (skipped when there is no database).
- **Browser-to-database import:** prospects saved in a browser before the database existed can be moved over in one click.
- **Password protection** (`src/proxy.ts`, `src/lib/auth`):
  - A shared `APP_PASSWORD` and a signed, HttpOnly session cookie that lasts 30 days.
  - The check runs in `proxy.ts` and again in every API route.
  - A Vercel deployment **without** `APP_PASSWORD` is locked; locally the app stays open.
- **Google content retention:**
  - Google-supplied details are cleared automatically after `GOOGLE_CONTENT_RETENTION_DAYS` (default 30).
  - Place IDs, statuses, notes and history are kept.
  - Expired details can be refreshed with Place Details: 1 billable request, confirmed first.
- Without `DATABASE_URL` the app still works in browser-only mode, as in Milestones 1–2.

### Deploying with a database
1. Vercel → Storage / Marketplace → add **Neon Postgres** to the project. This sets `DATABASE_URL`; use the pooled connection string.
2. Add `APP_PASSWORD` (and optionally `SESSION_SECRET`).
3. Redeploy. The build creates the tables.

### Database tests
`npm run test:db` runs repository integration tests against `TEST_DATABASE_URL`. **That database is wiped**, so use a throwaway local database only.

## Status — Milestone 4 ✅

- **Website analyzer** (`src/lib/analysis/`), started from **Analyze website** in a prospect's panel or **Analyze N websites** on the dashboard (two at a time).
  - Reads robots.txt, the homepage, at most one same-site contact/about page, and `/favicon.ico` only if no icon is declared.
  - Identifies itself as `MonstaLeadHunter/1.0`.
  - Honors robots.txt per RFC 9309: a robots.txt that returns 5xx or can't be reached means the site is not analyzed.
  - Limits: 10 s timeout per request, 1.5 MB per page, at most 4 redirects, each one re-checked.
- **All 14 rubric checks** are filled from real HTML, each with evidence and a confidence level.
  - Sites whose content is built by JavaScript get **unknown** for content checks instead of false failures.
  - Ambiguous headlines are marked unknown for a person to judge.
  - A Facebook or Yelp page listed as the "website" is reported as having no standalone site.
- **SSRF protection** (`netGuard.ts`, `safeFetch.ts`): only http/https on standard ports, no credentials in URLs. Private, loopback, link-local and metadata addresses are refused, checked at connection time so a DNS answer can't be swapped in later.
- **PageSpeed Insights** (optional, `PAGESPEED_API_KEY`): mobile performance, LCP and CLS, shown for information only and not scored in rubric v1.
- Fictional sample businesses keep their invented findings and are never fetched.
- Tests: `analysis.test.ts` covers the checks against synthetic HTML, plus robots rules, the network guard and the orchestrator with a stubbed network. `live.test.ts` is an opt-in live run (`LIVE_NETWORK=1`).

## Status — Milestone 5 ✅

- **Mini brand audit + outreach draft** for **qualified** prospects (`src/lib/outreach/`), shown in the prospect panel.
  - **Audit:** a headline, observed opportunities each shown with the recorded evidence, what's already working, recommended services, and an explicit "uncertain / not checked" list. Vehicle wraps are always "to be confirmed", because they can't be seen from a website.
  - **Template mode (free):** deterministic and built only from recorded findings.
  - **Claude mode (optional, `ANTHROPIC_API_KEY`):**
    - Asks for cost confirmation first. Uses structured outputs and server-side refusal fallbacks.
    - Website text is passed as untrusted data, not instructions.
    - Output is rejected unless every point cites a recorded finding with the matching result, and rejected if it includes links, prices or guarantees.
    - Evidence, uncertainties and recommended services always come from our own records.
  - The signature, mailing address and opt-out line are added by code (`SENDER_*` env vars, otherwise `[Your …]` placeholders).
- **Never sends anything.** Drafts are editable and saved.
  - **Copy** and **Open in my email app** (`mailto:`) unlock only after the prospect is *Approved for Outreach*, never for fictional samples, and only once edits are saved.
  - You send the email yourself, then mark the prospect *Contacted*.
- Stored in a new `outreach` column (`drizzle/0001_outreach.sql`, applied automatically at deploy).

## Roadmap

| Milestone | Scope |
|---|---|
| Later | CRM sync adapters, scheduled discovery (Vercel Cron), nationwide presets |

## Layout

```
src/lib/types.ts               domain model
src/lib/discovery/             provider interface, registry, sample provider, dedupe, query schema
src/lib/scoring/rubric.ts      scoring rubric (single source of truth for UI + /rubric page)
src/lib/store/                 ProspectStore interface + localStorage implementation
src/lib/status.ts              outreach approval gate
src/app/api/discover           server-only search endpoint (cost guard lives here)
src/components/                dashboard UI
```

## API keys

See `.env.example` and the in-app **Setup & API keys** page. All keys are server-only and never sent to the browser.
