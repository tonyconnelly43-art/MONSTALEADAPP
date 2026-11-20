import type { Outreach, Prospect } from "../types";
import type { ProspectStore } from "./types";

export interface DraftCostEstimate { billableRequests: number; estimatedUsd: number | null; explanation: string }

/** Generates (never sends) an audit + draft. Returns an estimate instead when AI mode needs confirmation. */
export async function requestOutreach(
  store: ProspectStore,
  p: Prospect,
  mode: "template" | "ai",
  confirmBillable = false,
): Promise<{ estimate: DraftCostEstimate } | { prospect: Prospect }> {
  const body = { mode, confirmBillable, ...(store.mode === "database" ? { id: p.id } : { prospect: p }) };
  const res = await fetch("/api/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (res.status === 409 && data?.estimate) return { estimate: data.estimate as DraftCostEstimate };
  if (!res.ok) throw new Error(data?.error ?? `Draft generation failed (${res.status})`);
  const updated: Prospect = store.mode === "database" ? data.prospect : { ...p, outreach: data.outreach as Outreach };
  store.put(updated);
  return { prospect: updated };
}
