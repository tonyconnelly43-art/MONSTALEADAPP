"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Database, HardDrive, Loader2, ScanSearch, Trash2, Upload } from "lucide-react";
import { analyzeProspect, canAnalyze } from "@/lib/store/analyze";
import type { Prospect } from "@/lib/types";
import { clearBrowserProspects, readBrowserProspects } from "@/lib/store/localStore";
import { PROSPECT_STATUSES } from "@/lib/types";
import { scoreProspect } from "@/lib/scoring/rubric";
import { useProspects } from "./ProspectsProvider";
import { SearchPanel } from "./SearchPanel";
import { ProspectTable, type Scored } from "./ProspectTable";
import { ProspectDrawer } from "./ProspectDrawer";

export function Dashboard() {
  const { prospects, store, ready, loadError } = useProspects();
  const [openId, setOpenId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function act(fn: () => Promise<unknown>) {
    try {
      setActionError(null);
      await fn();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  const rows: Scored[] = useMemo(() => prospects.map((p) => ({ p, s: scoreProspect(p) })), [prospects]);
  const fictionalCount = prospects.filter((p) => p.isFictional).length;
  const qualified = rows.filter((r) => r.s.qualified).length;
  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.s.total, 0) / rows.length) : 0;
  const open = prospects.find((p) => p.id === openId);

  return (
    <div className="space-y-5">
      {fictionalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span><strong>FICTIONAL SAMPLE DATA:</strong> {fictionalCount} prospect{fictionalCount === 1 ? " is" : "s are"} invented for demonstration. They are not real businesses.</span>
          </span>
          <button
            className="btn-ghost py-1 text-xs"
            onClick={() => act(async () => store?.remove(prospects.filter((p) => p.isFictional).map((p) => p.id)))}
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove sample data
          </button>
        </div>
      )}

      {loadError && <div role="alert" className="rounded-lg border border-brand-500/50 bg-brand-500/10 px-4 py-3 text-sm text-brand-400">{loadError}</div>}
      {actionError && <div role="alert" className="rounded-lg border border-brand-500/50 bg-brand-500/10 px-4 py-3 text-sm text-brand-400">{actionError}</div>}
      {store?.mode === "database" && <BrowserImport />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Prospects" value={rows.length} />
        <Kpi label="Qualified" value={qualified} hint="Score ≥ 55 and ≥ 60% data" />
        <Kpi label="Average score" value={avg} />
        <Kpi label="Approved for outreach" value={prospects.filter((p) => p.status === "Approved for Outreach").length} />
      </div>

      <SearchPanel />

      {ready && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {store?.mode === "database" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-300"><Database className="h-3 w-3" /> Saved to shared database</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-ink-800 px-2.5 py-1 text-ink-300" title="Set DATABASE_URL to share prospects across devices and teammates."><HardDrive className="h-3 w-3" /> Saved in this browser only</span>
          )}
          {store && <BulkAnalyze prospects={prospects} />}
          {rows.length > 0 && PROSPECT_STATUSES.map((s) => (
            <span key={s} className="rounded-full border border-ink-700 px-2.5 py-1 text-ink-300">
              {s}: <span className="font-semibold text-ink-100">{prospects.filter((p) => p.status === s).length}</span>
            </span>
          ))}
        </div>
      )}

      {!ready ? (
        <div className="card p-8 text-center text-sm text-ink-300">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="font-bold">No prospects yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-300">
            Run a search above. With the default <em>Sample data</em> source you get fictional Northeast Ohio businesses, so you can explore the scoring and pipeline at no cost.
          </p>
        </div>
      ) : (
        <ProspectTable rows={rows} onOpen={setOpenId} />
      )}

      {open && <ProspectDrawer key={open.id} prospect={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="card p-4" title={hint}>
      <div className="text-2xl font-black tabular-nums">{value}</div>
      <div className="text-xs text-ink-300">{label}</div>
    </div>
  );
}

/** Offers a one-time move of prospects saved in this browser (before the database existed). */
function BrowserImport() {
  const { store } = useProspects();
  const [count, setCount] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Reads browser storage once after mount (not available during server render).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCount(readBrowserProspects().length);
  }, []);

  if (count === 0 && !msg) return null;

  async function run() {
    if (!store) return;
    setBusy(true);
    try {
      const r = await store.addMany(readBrowserProspects());
      clearBrowserProspects();
      setCount(0);
      setMsg(`Imported ${r.added} prospect${r.added === 1 ? "" : "s"} (${r.duplicates} already in the database). The browser copy was cleared.`);
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-400/40 bg-sky-400/10 px-4 py-3 text-sm text-sky-200">
      <span>{msg ?? `${count} prospect${count === 1 ? " is" : "s are"} saved only in this browser from before the database was connected.`}</span>
      {count > 0 && (
        <button className="btn-ghost py-1 text-xs" onClick={run} disabled={busy}>
          <Upload className="h-3.5 w-3.5" /> Import to shared database
        </button>
      )}
    </div>
  );
}

/** Analyzes every real prospect with a website that hasn't been analyzed yet, two at a time. */
function BulkAnalyze({ prospects }: { prospects: Prospect[] }) {
  const { store } = useProspects();
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const pending = prospects.filter((p) => !p.analysis && canAnalyze(p).ok);
  if (!store || (pending.length === 0 && !progress)) return null;

  async function run() {
    if (!store) return;
    const queue = [...pending];
    let done = 0;
    let failed = 0;
    setProgress({ done, total: queue.length, failed });
    const worker = async () => {
      for (let p = queue.shift(); p; p = queue.shift()) {
        try {
          await analyzeProspect(store, p);
        } catch {
          failed++;
        }
        done++;
        setProgress({ done, total: done + queue.length, failed });
      }
    };
    await Promise.all([worker(), worker()]);
  }

  const running = progress && progress.done < progress.total;
  return (
    <button className="inline-flex items-center gap-1 rounded-full border border-sky-400/40 px-2.5 py-1 text-sky-300 hover:bg-sky-400/10 disabled:opacity-60" onClick={run} disabled={Boolean(running)}>
      {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <ScanSearch className="h-3 w-3" />}
      {running
        ? `Analyzing ${progress.done}/${progress.total}…`
        : progress && pending.length === 0
          ? `Analyzed ${progress.done}${progress.failed ? ` (${progress.failed} failed)` : ""}`
          : `Analyze ${pending.length} website${pending.length === 1 ? "" : "s"}`}
    </button>
  );
}
