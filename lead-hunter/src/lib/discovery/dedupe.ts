import type { DiscoveredBusiness } from "../types";

export function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const d = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return d.length === 10 ? d : null;
}

export function normalizeDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(llc|inc|co|corp|company|ltd)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Keys that identify the same real-world business across providers and repeat searches. */
export function dedupeKeys(b: DiscoveredBusiness): string[] {
  const keys = [`src:${b.provider}:${b.sourceId}`];
  const domain = normalizeDomain(b.website);
  // Shared hosting/builder domains (e.g. facebook.com) are not unique to one business.
  if (domain && !SHARED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) keys.push(`web:${domain}`);
  const phone = normalizePhone(b.phone);
  if (phone) keys.push(`tel:${phone}`);
  keys.push(`name:${normalizeName(b.name)}|${(b.city ?? "").toLowerCase()}`);
  return keys;
}

const SHARED_DOMAINS = ["facebook.com", "instagram.com", "google.com", "business.site", "yelp.com", "linktr.ee"];

/**
 * Remove duplicates within `incoming` and against `existing`. First occurrence wins.
 * Returns the unique new records and how many were dropped.
 */
export function dedupe<T extends DiscoveredBusiness>(
  incoming: T[],
  existing: DiscoveredBusiness[] = [],
): { unique: T[]; duplicates: number } {
  const seen = new Set<string>();
  for (const e of existing) for (const k of dedupeKeys(e)) seen.add(k);
  const unique: T[] = [];
  let duplicates = 0;
  for (const b of incoming) {
    const keys = dedupeKeys(b);
    if (keys.some((k) => seen.has(k))) {
      duplicates++;
      continue;
    }
    keys.forEach((k) => seen.add(k));
    unique.push(b);
  }
  return { unique, duplicates };
}
