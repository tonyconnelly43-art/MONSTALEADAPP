import type { Metadata } from "next";
import { FINDING_META, DIMENSION_LABELS } from "@/lib/findings";
import type { FindingDimension, FindingKey } from "@/lib/types";
import { OPPORTUNITY_WEIGHTS, NO_WEBSITE_POINTS, QUALIFY_THRESHOLD, MIN_COMPLETENESS, RUBRIC_VERSION, INDUSTRY_KEYWORDS } from "@/lib/scoring/rubric";

export const metadata: Metadata = { title: "Scoring rubric · MONSTA Lead Hunter" };

const FIT = [
  ["Target industry", 10, "Provider category matches the searched industry (keywords below). Unknown if no category."],
  ["In target market", 10, "City and state present from a location-bounded search."],
  ["Reachable", 5, "Has a public phone number or website."],
  ["Established business", 10, "Public review count: ≥25 → 10 · 10–24 → 7 · 1–9 → 4 · 0 → 1. Unknown if not provided."],
  ["Independent / local owner", 5, "Not a national chain or franchise (set during review). Unknown until assessed."],
] as const;

export default function RubricPage() {
  const dims = Object.keys(DIMENSION_LABELS) as FindingDimension[];
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-black">Opportunity scoring rubric</h1>
        <p className="mt-1 text-sm text-ink-300">Version {RUBRIC_VERSION}. Every point in a score can be traced back to a row below.</p>
      </header>

      <section className="card space-y-2 p-5 text-sm text-ink-300">
        <p><strong className="text-ink-100">Total (0–100) = Brand opportunity (0–60) + Business fit (0–40).</strong></p>
        <p>Brand opportunity gives points only for a weakness that was <em>actually observed</em>. A check that passed scores 0, and so does an <em>unknown</em> check. We never assume a weakness we couldn&apos;t see.</p>
        <p><strong className="text-ink-100">Data completeness</strong> is the share of the 100 points whose inputs could be checked.</p>
        <p>A prospect is <strong className="text-emerald-300">Qualified</strong> when its score is ≥ {QUALIFY_THRESHOLD} and completeness is ≥ {MIN_COMPLETENESS * 100}%. Otherwise it is shown as &ldquo;Low&rdquo; or &ldquo;Needs data&rdquo;.</p>
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-ink-700 px-5 py-3 font-bold">Brand opportunity (max 60)</h2>
        {dims.map((d) => {
          const keys = (Object.keys(FINDING_META) as FindingKey[]).filter((k) => FINDING_META[k].dimension === d);
          const total = keys.reduce((a, k) => a + OPPORTUNITY_WEIGHTS[k], 0);
          return (
            <div key={d} className="border-b border-ink-700 last:border-0">
              <h3 className="bg-ink-900 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-ink-300">{DIMENSION_LABELS[d]} · {total} pts</h3>
              <ul className="divide-y divide-ink-700/60 text-sm">
                {keys.map((k) => (
                  <li key={k} className="flex gap-4 px-5 py-2">
                    <span className="w-8 shrink-0 text-right font-semibold tabular-nums">{OPPORTUNITY_WEIGHTS[k]}</span>
                    <div><div>{FINDING_META[k].label}</div><div className="text-xs text-ink-300">Pass means: {FINDING_META[k].passMeans} Points are awarded when this fails.</div></div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        <p className="border-t border-ink-700 px-5 py-3 text-xs text-ink-300">
          <strong className="text-ink-100">No website:</strong> scores a flat {NO_WEBSITE_POINTS} points (a website design opportunity). The on-site checks are then marked unknown, so data completeness tops out at 60%. A no-website business can still qualify on business fit, but review its vehicles, signage and social profiles by hand before outreach.
        </p>
      </section>

      <section className="card overflow-hidden">
        <h2 className="border-b border-ink-700 px-5 py-3 font-bold">Business fit (max 40)</h2>
        <ul className="divide-y divide-ink-700/60 text-sm">
          {FIT.map(([label, pts, rule]) => (
            <li key={label} className="flex gap-4 px-5 py-2">
              <span className="w-8 shrink-0 text-right font-semibold tabular-nums">{pts}</span>
              <div><div>{label}</div><div className="text-xs text-ink-300">{rule}</div></div>
            </li>
          ))}
        </ul>
        <div className="border-t border-ink-700 px-5 py-3 text-xs text-ink-300">
          Industry keywords: {Object.entries(INDUSTRY_KEYWORDS).map(([k, v]) => `${k} (${v.join(", ")})`).join(" · ")}. A custom industry matches on its own name.
        </div>
      </section>
    </div>
  );
}
