import type { OutreachDraft, Prospect, ProspectStatus } from "../types";

export type StorageMode = "database" | "browser";

/**
 * Client-side prospect store. Two implementations:
 *  - "database": talks to /api/prospects (Postgres), shared by the whole team.
 *  - "browser": localStorage, used when no DATABASE_URL is configured.
 * `list()` returns an in-memory snapshot so React can subscribe synchronously.
 */
export interface ProspectStore {
  readonly mode: StorageMode;
  list(): Prospect[];
  subscribe(listener: () => void): () => void;
  /** Re-read from the source of truth. */
  reload(): Promise<void>;
  /** Save newly discovered prospects (browser mode; the server saves them itself in database mode). */
  addMany(prospects: Prospect[]): Promise<{ added: number; duplicates: number }>;
  update(id: string, patch: Partial<Pick<Prospect, "notes" | "chainSuspected">> & { draft?: OutreachDraft }): Promise<void>;
  setStatus(id: string, status: ProspectStatus, note?: string): Promise<{ ok: boolean; reason?: string }>;
  remove(ids: string[]): Promise<void>;
  /** Replace one prospect in the snapshot with a server-updated version. */
  put(prospect: Prospect): void;
}
