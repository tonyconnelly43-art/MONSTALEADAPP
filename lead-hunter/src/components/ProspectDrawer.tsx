"use client";
import { useEffect, useState } from "react";
import { X, ExternalLink, Phone, Globe, MapPin, Star, AlertTriangle, CheckCircle2, XCircle, HelpCircle, Lock } from "lucide-react";
import { PROSPECT_STATUSES, type Finding, type FindingDimension, type Prospect } from "@/lib/types";
import { scoreProspect, type ScoreComponent } from "@/lib/scoring/rubric";
import { DIMENSION_LABELS, FINDING_META } from "@/lib/findings";
import { canTransition } from "@/lib/status";
import { useProspects } from "./ProspectsProvider";
import { ScoreBadge, StatusBadge, FictionalTag } from "./Badges";

export function ProspectDrawer({ prospect, onClose }: { prospect: Prospect; onClose: () => void }) {
  const { store } = useProspects();
  const score = scoreProspect(prospect);
  const [notes, setNotes] = useState(prospect.notes);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function changeStatus(to: (typeof PROSPECT_STATUSES)[number]) {
    if (!store) return;
    const r = store.setStatus(prospect.id, to);
    setStatusError(r.ok ? null : (r.reason ?? "Not allowed."));
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={prospect.name}>
      <button className="absolute inset-0 bg-black/60" aria-label="Close" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-ink-700 bg-ink-900">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-ink-700 bg-ink-900/95 p-4 backdrop-blur sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">{prospect.name}</h2>
                {prospect.isFictional && <FictionalTag />}
              </div>
              <p className="text-sm text-ink-300">{prospect.industry} · {prospect.category ?? "No category"}</p>
            </div>
            <button onClick={onClose} className="rounded-md p-1.5 text-ink-300 hover:bg-ink-800 hover:text-white" aria-label="Close panel"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ScoreBadge score={score} />
            <StatusBadge status={prospect.status} />
          </div>
        </div>

        <div className="space-y-6 p-4 sm:p-5">
          {prospect.isFictional && (
            <div className="flex gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              This is a fictional sample business with invented findings. Do not contact it.
            </div>
          )}

          {/* Contact & source */}
          <section>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-300">Business details</h3>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <Detail icon={<MapPin className="h-4 w-4" />} label="Address" value={prospect.address} />
              <Detail icon={<Phone className="h-4 w-4" />} label="Phone" value={prospect.phone} />
              <Detail icon={<Globe className="h-4 w-4" />} label="Website" value={prospect.website} href={prospect.isFictional ? undefined : prospect.website ?? undefined} />
              <Detail icon={<Star className="h-4 w-4" />} label="Rating" value={prospect.rating != null ? `${prospect.rating} ★ (${prospect.reviewCount ?? "?"} reviews)` : prospect.reviewCount != null ? `${prospect.reviewCount} reviews` : null} />
              <Detail icon={<ExternalLink className="h-4 w-4" />} label="Source" value={prospect.sourceUrl ?? (prospect.isFictional ? "Fictional sample — no source" : null)} href={prospect.sourceUrl ?? undefined} />
              <Detail label="Retrieved" value={new Date(prospect.retrievedAt).toLocaleString()} />
            </dl>
          </section>

          {/* Status */}
          <section>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-300">Pipeline status</h3>
            <div className="flex flex-wrap gap-1.5">
              {PROSPECT_STATUSES.map((s) => {
                const check = canTransition(prospect, s);
                const current = s === prospect.status;
                return (
                  <button
                    key={s}
                    onClick={() => changeStatus(s)}
                    disabled={!check.ok}
                    title={check.reason}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${current ? "border-brand-500 bg-brand-500/20 text-white" : "border-ink-700 text-ink-300 enabled:hover:border-ink-500 enabled:hover:text-white disabled:opacity-40"}`}
                  >
                    {!check.ok && !current && <Lock className="h-3 w-3" />}{s}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ink-500">
              The app never sends messages. &ldquo;Contacted&rdquo; and later stages unlock only after you approve the prospect for outreach, and are records of actions you took yourself.
            </p>
            {statusError && <p className="mt-1 text-xs text-brand-400">{statusError}</p>}
            <ol className="mt-3 space-y-1 border-l border-ink-700 pl-3 text-xs text-ink-300">
              {[...prospect.statusHistory].reverse().map((h, i) => (
                <li key={i}><span className="text-ink-100">{h.status}</span> · {new Date(h.at).toLocaleString()}{h.note ? ` · ${h.note}` : ""}</li>
              ))}
            </ol>
          </section>

          {/* Score breakdown */}
          <section>
            <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-ink-300">Opportunity score</h3>
            <p className="mb-3 text-sm text-ink-300">{score.qualifyReason} <span className="text-ink-500">Rubric {score.version}.</span></p>
            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
              <Stat label="Brand opportunity" value={`${score.opportunity}/60`} />
              <Stat label="Business fit" value={`${score.fit}/40`} />
              <Stat label="Data completeness" value={`${Math.round(score.completeness * 100)}%`} />
            </div>
            <ComponentTable title="Brand opportunity (points = weakness observed)" items={score.components.filter((c) => c.group === "opportunity")} />
            <ComponentTable title="Business fit" items={score.components.filter((c) => c.group === "fit")} />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-300">Chain / franchise?</span>
              {([["No", false], ["Yes", true], ["Unknown", null]] as const).map(([label, v]) => (
                <button key={label} onClick={() => store?.update(prospect.id, { chainSuspected: v })} className={`rounded-md border px-2 py-0.5 text-xs ${prospect.chainSuspected === v ? "border-brand-500 bg-brand-500/20" : "border-ink-700 text-ink-300 hover:text-white"}`}>{label}</button>
              ))}
            </div>
          </section>

          {/* Findings with evidence */}
          <section>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-300">Website findings &amp; evidence</h3>
            <Findings prospect={prospect} />
          </section>

          {/* Notes */}
          <section>
            <label htmlFor="notes" className="mb-2 block text-sm font-bold uppercase tracking-wide text-ink-300">Notes</label>
            <textarea id="notes" rows={3} className="field" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== prospect.notes && store?.update(prospect.id, { notes })} placeholder="Observations from manual review (truck wraps, signage, social…)" />
          </section>

          <section className="rounded-lg border border-dashed border-ink-700 p-3 text-sm text-ink-300">
            <strong className="text-ink-100">Mini brand audit &amp; outreach draft:</strong> coming in Milestone 5. Drafts will cite only the evidence recorded above and will never be sent automatically.
          </section>
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, value, icon, href }: { label: string; value: string | null; icon?: React.ReactNode; href?: string }) {
  return (
    <div className="flex min-w-0 gap-2 rounded-md bg-ink-850 p-2.5">
      <span className="mt-0.5 text-ink-500">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[11px] uppercase tracking-wide text-ink-500">{label}</dt>
        <dd className="break-words">
          {value == null ? <span className="text-ink-500">Not available</span> : href ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:underline">{value}</a> : value}
        </dd>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-ink-850 p-2">
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[11px] text-ink-300">{label}</div>
    </div>
  );
}

function ComponentTable({ title, items }: { title: string; items: ScoreComponent[] }) {
  return (
    <div className="mb-3 overflow-hidden rounded-md border border-ink-700">
      <div className="bg-ink-850 px-3 py-1.5 text-xs font-semibold text-ink-300">{title}</div>
      <ul className="divide-y divide-ink-700/70 text-sm">
        {items.map((c) => (
          <li key={c.id} className="flex gap-3 px-3 py-2">
            <span className={`w-12 shrink-0 text-right tabular-nums ${c.unknown ? "text-ink-500" : c.points > 0 ? "font-semibold text-white" : "text-ink-300"}`}>
              {c.unknown ? "?" : c.points}/{c.max}
            </span>
            <div className="min-w-0">
              <div>{c.label}{c.unknown && <span className="ml-1.5 text-xs text-ink-500">(unknown)</span>}</div>
              <div className="text-xs text-ink-300">{c.reason}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const RESULT_ICON = {
  pass: <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-label="Pass" />,
  fail: <XCircle className="h-4 w-4 text-brand-400" aria-label="Weakness" />,
  unknown: <HelpCircle className="h-4 w-4 text-ink-500" aria-label="Unknown" />,
};

function Findings({ prospect }: { prospect: Prospect }) {
  const a = prospect.analysis;
  if (!prospect.website) return <p className="text-sm text-ink-300">No website listed — nothing to analyze. Check vehicles, signage, and social profiles manually.</p>;
  if (!a) return <p className="text-sm text-ink-300">Not analyzed yet. Automated website analysis arrives in Milestone 4.</p>;
  if (!a.fetched) return <p className="text-sm text-ink-300">Site could not be fetched: {a.fetchNote ?? "unknown error"}. All checks are unknown.</p>;

  const groups = new Map<FindingDimension, Finding[]>();
  for (const f of a.findings) groups.set(f.dimension, [...(groups.get(f.dimension) ?? []), f]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-500">Analyzed {new Date(a.analyzedAt).toLocaleString()} · {a.url}</p>
      {[...groups.entries()].map(([dim, fs]) => (
        <div key={dim}>
          <h4 className="mb-1 text-xs font-semibold text-ink-300">{DIMENSION_LABELS[dim]}</h4>
          <ul className="space-y-1.5">
            {fs.map((f) => (
              <li key={f.key} className="flex gap-2 rounded-md bg-ink-850 p-2 text-sm">
                <span className="mt-0.5">{RESULT_ICON[f.result]}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{FINDING_META[f.key].label}</span>
                    <span className="rounded bg-ink-800 px-1.5 text-[10px] uppercase tracking-wide text-ink-300">{f.confidence} confidence</span>
                  </div>
                  <div className="break-words text-xs text-ink-300">{f.evidence ?? f.note ?? "No evidence recorded."}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
