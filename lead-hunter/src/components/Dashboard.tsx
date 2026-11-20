"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { PROSPECT_STATUSES } from "@/lib/types";
import { scoreProspect } from "@/lib/scoring/rubric";
import { useProspects } from "./ProspectsProvider";
import { SearchPanel } from "./SearchPanel";
import { ProspectTable, type Scored } from "./ProspectTable";
import { ProspectDrawer } from "./ProspectDrawer";

export function Dashboard() {
  const { prospects, store, ready } = useProspects();
  const [openId, setOpenId] = useState<string | null>(null);

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
            onClick={() => store?.remove(prospects.filter((p) => p.isFictional).map((p) => p.id))}
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove sample data
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Prospects" value={rows.length} />
        <Kpi label="Qualified" value={qualified} hint="Score ≥ 55 and ≥ 60% data" />
        <Kpi label="Average score" value={avg} />
        <Kpi label="Approved for outreach" value={prospects.filter((p) => p.status === "Approved for Outreach").length} />
      </div>

      <SearchPanel />

      {rows.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {PROSPECT_STATUSES.map((s) => (
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
