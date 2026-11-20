"use client";
import { useEffect, useState } from "react";
import { Search, Loader2, Info } from "lucide-react";
import { PRESET_INDUSTRIES, type ProviderId, type Prospect } from "@/lib/types";
import { ALL_INDUSTRIES, DEFAULT_QUERY } from "@/lib/discovery/query";
import { PILOT_MAX_RESULTS } from "@/lib/discovery/provider";
import { useProspects } from "./ProspectsProvider";

interface ProviderInfo { id: ProviderId; label: string; isLive: boolean; available: boolean; unavailableReason?: string }

const CUSTOM = "__custom__";
const PILOT_PRESETS = ["Macedonia", "Twinsburg", "Hudson", "Solon"];

export function SearchPanel() {
  const { store } = useProspects();
  const [q, setQ] = useState(DEFAULT_QUERY);
  const [industryChoice, setIndustryChoice] = useState<string>(ALL_INDUSTRIES);
  const [customIndustry, setCustomIndustry] = useState("");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [provider, setProvider] = useState<ProviderId>("sample");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<{ tone: "info" | "error"; text: string }[]>([]);

  useEffect(() => {
    fetch("/api/providers").then((r) => r.json()).then((d) => setProviders(d.providers)).catch(() => {});
  }, []);

  const industry = industryChoice === CUSTOM ? customIndustry : industryChoice;

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;
    setBusy(true);
    setMessages([]);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, query: { ...q, industry }, confirmBillable: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        const issues = (data.issues as { message: string }[] | undefined)?.map((i) => i.message).join("; ");
        setMessages([{ tone: "error", text: issues || data.error || "Search failed." }]);
        return;
      }
      const { added, duplicates } = store.addMany(data.prospects as Prospect[]);
      const totalDupes = duplicates + (data.duplicatesRemoved as number);
      setMessages([
        { tone: "info", text: `Found ${data.prospects.length} · added ${added} new · ${totalDupes} duplicate${totalDupes === 1 ? "" : "s"} skipped · ${data.billableRequestsMade} billable API calls.` },
        ...(data.notes as string[]).map((t) => ({ tone: "info" as const, text: t })),
      ]);
    } catch {
      setMessages([{ tone: "error", text: "Network error. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={run} className="card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold">Discover businesses</h2>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className="text-ink-300">Pilot:</span>
          {PILOT_PRESETS.map((c) => (
            <button key={c} type="button" onClick={() => setQ({ ...q, city: c, state: "OH" })} className="rounded-full border border-ink-700 px-2 py-0.5 text-ink-300 hover:border-brand-500 hover:text-white">
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <div className="col-span-2 md:col-span-2">
          <label className="label" htmlFor="city">City</label>
          <input id="city" className="field" value={q.city} onChange={(e) => setQ({ ...q, city: e.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="state">State</label>
          <input id="state" className="field uppercase" maxLength={2} value={q.state} onChange={(e) => setQ({ ...q, state: e.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="radius">Radius (mi)</label>
          <input id="radius" type="number" min={1} max={50} className="field" value={q.radiusMiles} onChange={(e) => setQ({ ...q, radiusMiles: Number(e.target.value) })} />
        </div>
        <div className="col-span-2">
          <label className="label" htmlFor="industry">Industry</label>
          <select id="industry" className="field" value={industryChoice} onChange={(e) => setIndustryChoice(e.target.value)}>
            <option value={ALL_INDUSTRIES}>{ALL_INDUSTRIES}</option>
            {PRESET_INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            <option value={CUSTOM}>Custom…</option>
          </select>
        </div>
        {industryChoice === CUSTOM && (
          <div className="col-span-2 md:col-span-3">
            <label className="label" htmlFor="custom">Custom industry</label>
            <input id="custom" className="field" placeholder="e.g. Pest control, Concrete, Pool service" value={customIndustry} onChange={(e) => setCustomIndustry(e.target.value)} required />
          </div>
        )}
        <div className={industryChoice === CUSTOM ? "col-span-2 md:col-span-2" : "col-span-2 md:col-span-3"}>
          <label className="label" htmlFor="provider">Data source</label>
          <select id="provider" className="field" value={provider} onChange={(e) => setProvider(e.target.value as ProviderId)}>
            {(providers.length ? providers : [{ id: "sample", label: "Sample data (fictional, no API calls)", available: true, isLive: false }]).map((p) => (
              <option key={p.id} value={p.id} disabled={!p.available}>
                {p.label}{!p.available ? " — not configured" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="limit">Max results</label>
          <input id="limit" type="number" min={1} max={PILOT_MAX_RESULTS} className="field" value={q.limit} onChange={(e) => setQ({ ...q, limit: Number(e.target.value) })} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-ink-300">
          <Info className="h-3.5 w-3.5" aria-hidden />
          {provider === "sample" ? "Sample mode: no API calls, no cost." : "Live search: you will see a cost estimate before anything is billed."}
        </p>
        <button className="btn-primary" disabled={busy || !store}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Run search
        </button>
      </div>

      {messages.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm" aria-live="polite">
          {messages.map((m, i) => (
            <li key={i} className={m.tone === "error" ? "text-brand-400" : "text-ink-300"}>{m.text}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
