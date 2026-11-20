import type { Prospect } from "../types";
import type { ProspectStore } from "./types";
import { goToLogin } from "../navigate";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const data = await res.json().catch(() => null);
  if (res.status === 401) goToLogin(); // session expired
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

const enc = (id: string) => encodeURIComponent(id);

/** Shared Postgres-backed store via the app's API routes. */
export function createRemoteStore(): ProspectStore {
  let items: Prospect[] = [];
  const listeners = new Set<() => void>();
  const set = (next: Prospect[]) => {
    items = next;
    listeners.forEach((l) => l());
  };
  const put = (p: Prospect) => set(items.map((x) => (x.id === p.id ? p : x)));

  const store: ProspectStore = {
    mode: "database",
    list: () => items,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async reload() {
      const { prospects } = await api<{ prospects: Prospect[] }>("/api/prospects");
      set(prospects);
    },
    async addMany(prospects) {
      const r = await api<{ added: number; duplicates: number }>("/api/prospects/import", {
        method: "POST",
        body: JSON.stringify({ prospects }),
      });
      await store.reload();
      return r;
    },
    async update(id, patch) {
      const { prospect } = await api<{ prospect: Prospect }>(`/api/prospects/${enc(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
      put(prospect);
    },
    async setStatus(id, status, note) {
      try {
        const { prospect } = await api<{ prospect: Prospect }>(`/api/prospects/${enc(id)}/status`, {
          method: "POST",
          body: JSON.stringify({ status, note }),
        });
        put(prospect);
        return { ok: true };
      } catch (e) {
        return { ok: false, reason: (e as Error).message };
      }
    },
    async remove(ids) {
      await api("/api/prospects", { method: "DELETE", body: JSON.stringify({ ids }) });
      set(items.filter((p) => !ids.includes(p.id)));
    },
    put,
  };
  return store;
}
