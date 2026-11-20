import type { Prospect, ProspectStatus } from "../types";

/**
 * Storage abstraction. Milestone 1 ships a browser localStorage implementation;
 * Milestone 3 adds a Postgres-backed implementation behind API routes with the same shape.
 */
export interface ProspectStore {
  list(): Prospect[];
  /** Notifies listeners after any change. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Adds prospects not already present (deduped). Returns count added and duplicates skipped. */
  addMany(prospects: Prospect[]): { added: number; duplicates: number };
  update(id: string, patch: Partial<Pick<Prospect, "notes" | "chainSuspected">>): void;
  setStatus(id: string, status: ProspectStatus, note?: string): { ok: boolean; reason?: string };
  remove(ids: string[]): void;
  clear(): void;
}
