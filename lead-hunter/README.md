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

## Roadmap

| Milestone | Scope |
|---|---|
| 2 | Google Places API (New) provider: field-masked Text Search, 25-result cap, confirm-before-billing, daily request cap, 24h cache |
| 3 | Postgres (Neon) store + password protection |
| 4 | Website analyzer (robots.txt-aware, ≤2 pages, evidence and confidence) + PageSpeed Insights |
| 5 | Mini brand audit + outreach drafts (template; optional Claude), copy or mailto only |
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
