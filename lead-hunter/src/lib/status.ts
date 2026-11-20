import { PROSPECT_STATUSES, type Prospect, type ProspectStatus } from "./types";

const idx = (s: ProspectStatus) => PROSPECT_STATUSES.indexOf(s);

/**
 * Outreach safety gate: a prospect can only be marked Contacted (or any later stage)
 * after a human has explicitly moved it to "Approved for Outreach".
 * The app itself never sends messages; "Contacted" is a manual record of what you did.
 */
export function canTransition(p: Prospect, to: ProspectStatus): { ok: boolean; reason?: string } {
  if (to === p.status) return { ok: false, reason: "Already in this status." };
  if (idx(to) >= idx("Contacted")) {
    const approved = p.status === "Approved for Outreach" || p.statusHistory.some((h) => h.status === "Approved for Outreach");
    if (!approved) return { ok: false, reason: "Approve for outreach first." };
  }
  return { ok: true };
}

export const STATUS_STYLES: Record<ProspectStatus, string> = {
  New: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
  Reviewed: "bg-indigo-500/15 text-indigo-300 ring-indigo-400/30",
  "Approved for Outreach": "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  Contacted: "bg-violet-500/15 text-violet-300 ring-violet-400/30",
  Replied: "bg-teal-500/15 text-teal-300 ring-teal-400/30",
  "Meeting Booked": "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
  Closed: "bg-slate-500/20 text-slate-300 ring-slate-400/30",
};
