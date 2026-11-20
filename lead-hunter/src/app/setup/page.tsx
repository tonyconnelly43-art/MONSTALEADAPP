import type { Metadata } from "next";
import { CheckCircle2, Circle } from "lucide-react";

export const metadata: Metadata = { title: "Setup · MONSTA Lead Hunter" };
export const dynamic = "force-dynamic";

/** Shows only whether each key is set — never the value. */
const KEYS = [
  { env: "GOOGLE_PLACES_API_KEY", required: "Required for live discovery", detail: "Google Cloud → enable “Places API (New)” → create an API key → restrict it to that API → set a daily quota. Text Search with phone + website fields is billed at the Enterprise tier (about $35 per 1,000 requests, with a free monthly allowance). A 25-business pilot uses 2 requests." },
  { env: "PLACES_DAILY_REQUEST_CAP", required: "Optional (default 20)", detail: "App-side ceiling on billable Places requests per day. It is kept in server memory until Milestone 3, so the Google Cloud quota on the key is your hard limit." },
  { env: "PAGESPEED_API_KEY", required: "Optional (Milestone 4)", detail: "Free. Raises the PageSpeed Insights quota for mobile and performance checks." },
  { env: "ANTHROPIC_API_KEY", required: "Optional (Milestone 5)", detail: "Only for LLM-written audits and drafts. Template mode is free. Roughly $0.06 per prospect on Claude Opus 5.5, or about $0.002 on Claude Haiku 5.5." },
  { env: "APP_PASSWORD", required: "Required on Vercel", detail: "Shared team password. A Vercel deployment without it stays locked, so it can't run up API costs if the URL leaks. Locally, the app is open when this is unset." },
  { env: "SESSION_SECRET", required: "Optional", detail: "Random string used to sign sign-in cookies (e.g. openssl rand -base64 32). If unset, a key derived from APP_PASSWORD is used, so changing the password signs everyone out." },
  { env: "DATABASE_URL", required: "Recommended", detail: "Postgres, e.g. Neon from the Vercel Marketplace (use the pooled connection string). Tables are created automatically on deploy. Without it, prospects are saved only in each user's browser." },
  { env: "GOOGLE_CONTENT_RETENTION_DAYS", required: "Optional (default 30)", detail: "How long Google-supplied details (name, phone, website…) are kept before being cleared automatically. Place IDs, statuses, notes and history are always kept, and details can be refreshed (1 billable request each)." },
];

export default function SetupPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-black">Setup &amp; API keys</h1>
        <p className="mt-1 text-sm text-ink-300">
          Keys are read only on the server and never sent to the browser. In production, set them in Vercel → Project → Settings → Environment Variables. Locally, copy <code>.env.example</code> to <code>.env.local</code>.
        </p>
      </header>
      <ul className="space-y-3">
        {KEYS.map((k) => {
          const set = Boolean(process.env[k.env]);
          return (
            <li key={k.env} className="card flex gap-3 p-4">
              {set ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-ink-500" />}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="font-semibold">{k.env}</code>
                  <span className="text-xs text-ink-300">{k.required}</span>
                  <span className={`text-xs ${set ? "text-emerald-300" : "text-ink-500"}`}>{set ? "Configured" : "Not set"}</span>
                </div>
                <p className="mt-1 text-sm text-ink-300">{k.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <section className="card p-4 text-sm text-ink-300">
        <h2 className="mb-1 font-bold text-ink-100">Data &amp; outreach policy</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Businesses come only from official provider APIs. No scraping of listing sites, and no invented businesses outside the labeled sample set.</li>
          <li>Website checks read only publicly accessible pages, follow robots.txt, and record evidence. Anything that can&apos;t be observed is recorded as &ldquo;unknown&rdquo;.</li>
          <li>The app never sends emails or messages. Outreach drafts are for you to review and send yourself.</li>
        </ul>
      </section>
    </div>
  );
}
