import type { Prospect } from "../types";
import type { ProspectStore } from "./types";
import { dedupe } from "../discovery/dedupe";
import { canTransition } from "../status";

const KEY = "monsta-lead-hunter:prospects:v1";

/** Prospects saved in this browser (Milestones 1–2, or when no database is configured). */
export function readBrowserProspects(): Prospect[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Prospect[]) : [];
    // Older saves predate the retention fields.
    return list.map((p) => ({ ...p, contentExpiresAt: p.contentExpiresAt ?? null, contentExpired: p.contentExpired ?? false }));
  } catch {
    return [];
  }
}

export function clearBrowserProspects() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

function write(list: Prospect[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage unavailable (private mode / quota); state remains in memory for this session.
  }
}

/** Browser-only store. Data lives in this browser only — not shared, not backed up. */
export function createLocalStore(): ProspectStore {
  let items: Prospect[] = [];
  const listeners = new Set<() => void>();
  const commit = (next: Prospect[]) => {
    items = next;
    write(items);
    listeners.forEach((l) => l());
  };

  return {
    mode: "browser",
    list: () => items,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async reload() {
      items = readBrowserProspects();
      listeners.forEach((l) => l());
    },
    async addMany(incoming) {
      const { unique, duplicates } = dedupe(incoming, items);
      if (unique.length) commit([...items, ...unique]);
      return { added: unique.length, duplicates };
    },
    async update(id, patch) {
      commit(items.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    },
    async setStatus(id, status, note) {
      const p = items.find((x) => x.id === id);
      if (!p) return { ok: false, reason: "Not found." };
      const check = canTransition(p, status);
      if (!check.ok) return check;
      const change = { status, at: new Date().toISOString(), ...(note ? { note } : {}) };
      commit(items.map((x) => (x.id === id ? { ...x, status, statusHistory: [...x.statusHistory, change] } : x)));
      return { ok: true };
    },
    async remove(ids) {
      const set = new Set(ids);
      commit(items.filter((p) => !set.has(p.id)));
    },
    put(prospect) {
      commit(items.map((p) => (p.id === prospect.id ? prospect : p)));
    },
  };
}
