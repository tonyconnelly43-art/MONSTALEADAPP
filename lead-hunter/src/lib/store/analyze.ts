import type { Prospect } from "../types";
import type { ProspectStore } from "./types";

export function canAnalyze(p: Prospect): { ok: boolean; reason?: string } {
  if (p.isFictional) return { ok: false, reason: "Fictional sample: findings are invented for the demo." };
  if (p.contentExpired) return { ok: false, reason: "Google details expired. Refresh first." };
  if (!p.website) return { ok: false, reason: "No website listed." };
  return { ok: true };
}

/** Runs the server-side website analysis and stores the result. Throws with a readable message. */
export async function analyzeProspect(store: ProspectStore, p: Prospect): Promise<Prospect> {
  const body =
    store.mode === "database"
      ? { id: p.id }
      : { prospect: { id: p.id, website: p.website, name: p.name, phone: p.phone, city: p.city, industry: p.industry, isFictional: p.isFictional, contentExpired: p.contentExpired } };
  const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Analysis failed (${res.status})`);
  const updated: Prospect = store.mode === "database" ? data.prospect : { ...p, analysis: data.analysis };
  store.put(updated);
  return updated;
}
