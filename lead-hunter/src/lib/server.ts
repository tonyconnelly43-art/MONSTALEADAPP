import "server-only";
import { getDb, isDbConfigured } from "./db/client";
import { createDbProspectRepo, type ProspectRepo } from "./repo/prospectRepo";
import { DEFAULT_GOOGLE_RETENTION_DAYS } from "./prospects";

export type StorageMode = "database" | "browser";

export function storageMode(): StorageMode {
  return isDbConfigured() ? "database" : "browser";
}

let repo: ProspectRepo | null = null;
/** Returns the Postgres repository, or null when running in browser-storage mode. */
export function getRepo(): ProspectRepo | null {
  if (!isDbConfigured()) return null;
  return (repo ??= createDbProspectRepo(getDb()));
}

export function googleRetentionDays(): number {
  const n = Number(process.env.GOOGLE_CONTENT_RETENTION_DAYS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_GOOGLE_RETENTION_DAYS;
}
