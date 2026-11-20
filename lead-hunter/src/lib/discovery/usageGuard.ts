/**
 * Cost guard for billable providers: a daily request cap plus a short-lived result cache.
 *
 * NOTE: This is in-memory, so on Vercel each server instance keeps its own counter and cache,
 * and both reset on cold start. Treat it as a convenience layer; the authoritative hard limit
 * is the quota you set on the API key in Google Cloud Console. Milestone 3 persists both in Postgres.
 */
export interface UsageGuard {
  remainingToday(): number;
  record(requests: number): void;
  getCached<T>(key: string): T | undefined;
  setCached<T>(key: string, value: T): void;
}

export function createUsageGuard(opts: { dailyCap: number; cacheTtlMs?: number; now?: () => number }): UsageGuard {
  const now = opts.now ?? Date.now;
  const ttl = opts.cacheTtlMs ?? 24 * 60 * 60 * 1000;
  let day = "";
  let used = 0;
  const cache = new Map<string, { at: number; value: unknown }>();
  const today = () => new Date(now()).toISOString().slice(0, 10);
  const roll = () => {
    if (day !== today()) {
      day = today();
      used = 0;
    }
  };
  return {
    remainingToday() {
      roll();
      return Math.max(0, opts.dailyCap - used);
    },
    record(n) {
      roll();
      used += n;
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
