/**
 * Cost guard for billable providers: a daily request cap plus a short-lived result cache.
 *
 * The request counter is pluggable: in-memory (per server instance, resets on cold start) or
 * Postgres-backed (shared across instances — used automatically when DATABASE_URL is set).
 * Either way, the authoritative hard limit is the quota on the API key in Google Cloud Console.
 *
 * The result cache is intentionally in-memory only: it is a short-lived performance cache of
 * provider content, not durable storage.
 */
export interface RequestCounter {
  usedOn(day: string): Promise<number>;
  add(day: string, n: number): Promise<void>;
}

export function createMemoryCounter(): RequestCounter {
  const used = new Map<string, number>();
  return {
    async usedOn(day) {
      return used.get(day) ?? 0;
    },
    async add(day, n) {
      used.set(day, (used.get(day) ?? 0) + n);
    },
  };
}

export interface UsageGuard {
  remainingToday(): Promise<number>;
  record(requests: number): Promise<void>;
  getCached<T>(key: string): T | undefined;
  setCached<T>(key: string, value: T): void;
}

export function createUsageGuard(opts: {
  dailyCap: number;
  counter?: RequestCounter;
  cacheTtlMs?: number;
  now?: () => number;
}): UsageGuard {
  const now = opts.now ?? Date.now;
  const ttl = opts.cacheTtlMs ?? 24 * 60 * 60 * 1000;
  const counter = opts.counter ?? createMemoryCounter();
  const cache = new Map<string, { at: number; value: unknown }>();
  const today = () => new Date(now()).toISOString().slice(0, 10); // UTC day
  return {
    async remainingToday() {
      return Math.max(0, opts.dailyCap - (await counter.usedOn(today())));
    },
    async record(n) {
      await counter.add(today(), n);
    },
    getCached<T>(key: string) {
      const hit = cache.get(key);
      if (!hit) return undefined;
      if (now() - hit.at > ttl) {
        cache.delete(key);
        return undefined;
      }
      return hit.value as T;
    },
    setCached(key, value) {
      cache.set(key, { at: now(), value });
    },
  };
}
