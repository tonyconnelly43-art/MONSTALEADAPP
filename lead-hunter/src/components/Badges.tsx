import type { ProspectStatus } from "@/lib/types";
import { STATUS_STYLES } from "@/lib/status";
import type { ScoreResult } from "@/lib/scoring/rubric";

export function StatusBadge({ status }: { status: ProspectStatus }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

export function ScoreBadge({ score }: { score: ScoreResult }) {
  const tone = score.qualified
    ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/40"
    : score.completeness < 0.6
      ? "bg-slate-500/15 text-slate-300 ring-slate-400/30"
      : "bg-ink-800 text-ink-300 ring-ink-700";
  return (
    <span title={score.qualifyReason} className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone}`}>
      <span className="text-sm tabular-nums">{score.total}</span>
      <span className="font-normal opacity-80">{score.qualified ? "Qualified" : score.completeness < 0.6 ? "Needs data" : "Low"}</span>
    </span>
  );
}

export function FictionalTag() {
  return (
    <span className="inline-flex items-center rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300 ring-1 ring-inset ring-amber-400/40">
      Fictional
    </span>
  );
}
