import type { Prospect, ProspectStatus } from "../types";
import type { ProspectStore } from "./types";
import { dedupe } from "../discovery/dedupe";
import { canTransition } from "../status";

const KEY = "monsta-lead-hunter:prospects:v1";

function read(): Prospect[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Prospect[]) : [];
  } catch {
    return [];
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
  let items: Prospect[] | null = null; // loaded lazily on first client-side access
  const listeners = new Set<() => void>();
  const get = () => (items ??= read());
  const commit = (next: Prospect[]) => {
    items = next;
    write(items);
    listeners.forEach((l) => l());
  };

  return {
    list: get,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    addMany(incoming) {
      const { unique, duplicates } = dedupe(incoming, get());
      if (unique.length) commit([...get(), ...unique]);
      return { added: unique.length, duplicates };
    },
    update(id, patch) {
      commit(get().map((p) => (p.id === id ? { ...p, ...patch } : p)));
    },
    setStatus(id, status: ProspectStatus, note) {
      const p = get().find((x) => x.id === id);
      if (!p) return { ok: false, reason: "Not found." };
      const check = canTransition(p, status);
      if (!check.ok) return check;
      const change = { status, at: new Date().toISOString(), ...(note ? { note } : {}) };
      commit(get().map((x) => (x.id === id ? { ...x, status, statusHistory: [...x.statusHistory, change] } : x)));
      return { ok: true };
    },
    remove(ids) {
      const set = new Set(ids);
      commit(get().filter((p) => !set.has(p.id)));
    },
    clear() {
      commit([]);
    },
  };
}
