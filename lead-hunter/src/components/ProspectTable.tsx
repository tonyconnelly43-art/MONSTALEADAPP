"use client";
import { useMemo, useState } from "react";
import { ArrowDownUp, Globe, Phone } from "lucide-react";
import { PROSPECT_STATUSES, type Prospect, type ProspectStatus } from "@/lib/types";
import type { ScoreResult } from "@/lib/scoring/rubric";
import { ScoreBadge, StatusBadge, FictionalTag } from "./Badges";

export type Scored = { p: Prospect; s: ScoreResult };
type SortKey = "score" | "name" | "city";

function hostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export function ProspectTable({ rows, onOpen }: { rows: Scored[]; onOpen: (id: string) => void }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<ProspectStatus | "">("");
  const [industry, setIndustry] = useState("");
  const [qualifiedOnly, setQualifiedOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("score");

  const industries = useMemo(() => [...new Set(rows.map((r) => r.p.industry))].sort(), [rows]);

  const visible = useMemo(() => {
    const t = text.trim().toLowerCase();
    return rows
      .filter(({ p, s }) =>
        (!t || `${p.name} ${p.city ?? ""} ${p.category ?? ""}`.toLowerCase().includes(t)) &&
        (!status || p.status === status) &&
        (!industry || p.industry === industry) &&
        (!qualifiedOnly || s.qualified))
      .sort((a, b) =>
        sort === "score" ? b.s.total - a.s.total
        : sort === "name" ? a.p.name.localeCompare(b.p.name)
        : (a.p.city ?? "").localeCompare(b.p.city ?? ""));
  }, [rows, text, status, industry, qualifiedOnly, sort]);

  return (
    <section className="card">
      <div className="flex flex-wrap items-end gap-3 border-b border-ink-700 p-4">
        <div className="min-w-0 flex-1 basis-48">
          <label className="label" htmlFor="q">Search</label>
          <input id="q" className="field" placeholder="Name, city, category" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="basis-40">
          <label className="label" htmlFor="fs">Status</label>
          <select id="fs" className="field" value={status} onChange={(e) => setStatus(e.target.value as ProspectStatus | "")}>
            <option value="">All statuses</option>
            {PROSPECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="basis-36">
          <label className="label" htmlFor="fi">Industry</label>
          <select id="fi" className="field" value={industry} onChange={(e) => setIndustry(e.target.value)}>
            <option value="">All</option>
            {industries.map((i) => <option key={i}>{i}</option>)}
          </select>
        </div>
        <div className="basis-32">
          <label className="label" htmlFor="sort">Sort</label>
          <select id="sort" className="field" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="score">Score</option>
            <option value="name">Name</option>
            <option value="city">City</option>
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-ink-300">
          <input type="checkbox" className="accent-brand-500" checked={qualifiedOnly} onChange={(e) => setQualifiedOnly(e.target.checked)} />
          Qualified only
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="p-8 text-center text-sm text-ink-300">No prospects match these filters.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-300">
                <tr className="border-b border-ink-700">
                  <th className="px-4 py-2.5 font-medium">Business</th>
                  <th className="px-4 py-2.5 font-medium">Industry</th>
                  <th className="px-4 py-2.5 font-medium">Contact</th>
                  <th className="px-4 py-2.5 font-medium"><span className="inline-flex items-center gap-1">Score <ArrowDownUp className="h-3 w-3" /></span></th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(({ p, s }) => (
                  <tr key={p.id} onClick={() => onOpen(p.id)} className="cursor-pointer border-b border-ink-700/60 last:border-0 hover:bg-ink-800/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="text-left font-semibold hover:text-brand-400" onClick={(e) => { e.stopPropagation(); onOpen(p.id); }}>{p.name}</button>
                        {p.isFictional && <FictionalTag />}
                      </div>
                      <div className="text-xs text-ink-300">{[p.city, p.state].filter(Boolean).join(", ") || "Location unknown"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{p.industry}</div>
                      <div className="text-xs text-ink-300">{p.category ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-1.5 text-ink-100"><Phone className="h-3 w-3 text-ink-500" />{p.phone ?? <span className="text-ink-500">No phone</span>}</div>
                      <div className="flex items-center gap-1.5 text-ink-300"><Globe className="h-3 w-3 text-ink-500" />{p.website ? hostname(p.website) : <span className="text-ink-500">No website</span>}</div>
                    </td>
                    <td className="px-4 py-3"><ScoreBadge score={s} /></td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <ul className="divide-y divide-ink-700 md:hidden">
            {visible.map(({ p, s }) => (
              <li key={p.id}>
                <button onClick={() => onOpen(p.id)} className="w-full p-4 text-left hover:bg-ink-800/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-ink-300">{p.industry} · {[p.city, p.state].filter(Boolean).join(", ")}</div>
                    </div>
                    <ScoreBadge score={s} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={p.status} />
                    {p.isFictional && <FictionalTag />}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="border-t border-ink-700 px-4 py-2 text-xs text-ink-500">Showing {visible.length} of {rows.length}</p>
    </section>
  );
}
