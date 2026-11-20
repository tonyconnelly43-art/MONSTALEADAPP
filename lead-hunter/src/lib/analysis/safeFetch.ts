import dns from "node:dns";
import { Agent, fetch as undiciFetch } from "undici";
import { assertFetchableUrl, BlockedUrlError, isBlockedIp } from "./netGuard";
import { isAllowed } from "./robots";

export const USER_AGENT = "MonstaLeadHunter/1.0 (website brand review; respects robots.txt)";
export const AGENT_TOKEN = "monstaleadhunter";
const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 10_000;

type LookupCb = (err: NodeJS.ErrnoException | null, address?: string | dns.LookupAddress[], family?: number) => void;

/** DNS lookup that refuses private/reserved addresses at connect time (prevents DNS rebinding). */
function safeLookup(hostname: string, options: dns.LookupOptions, callback: LookupCb) {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0 || list.some((a) => isBlockedIp(a.address))) {
      return callback(Object.assign(new BlockedUrlError(`${hostname} resolves to a private or reserved address.`), { code: "EBLOCKED" }));
    }
    if (options.all) callback(null, list);
    else callback(null, list[0].address, list[0].family);
  });
}

const agent = new Agent({ connect: { lookup: safeLookup as never }, headersTimeout: TIMEOUT_MS, bodyTimeout: TIMEOUT_MS });

export interface FetchedPage {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  contentType: string;
  body: string;
  truncated: boolean;
}

export type Fetcher = (url: string, opts?: { maxBytes?: number; accept?: string }) => Promise<FetchedPage>;

/** GET with manual, re-validated redirects and a byte cap. Throws on network/blocked errors. */
export const safeFetch: Fetcher = async (url, opts = {}) => {
  const maxBytes = opts.maxBytes ?? 1_500_000;
  let current = assertFetchableUrl(url);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await undiciFetch(current.toString(), {
      dispatcher: agent,
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT, Accept: opts.accept ?? "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      await res.body?.cancel();
      current = assertFetchableUrl(new URL(res.headers.get("location")!, current).toString());
      continue;
    }
    let received = 0;
    let truncated = false;
    const chunks: Uint8Array[] = [];
    if (res.body) {
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > maxBytes) {
          truncated = true;
          chunks.push(value.subarray(0, value.byteLength - (received - maxBytes)));
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }
    return {
      requestedUrl: url,
      finalUrl: current.toString(),
      status: res.status,
      contentType: res.headers.get("content-type") ?? "",
      body: Buffer.concat(chunks).toString("utf8"),
      truncated,
    };
  }
  throw new Error("Too many redirects.");
};

/**
 * robots.txt check per RFC 9309: 4xx → allowed; 5xx or unreachable → treat as disallowed.
 * Results are cached per origin for the lifetime of the returned checker.
 */
export function createRobotsChecker(fetcher: Fetcher) {
  // string = robots.txt body ("" = none); "unreachable" / "server-error" = treat as disallowed.
  const cache = new Map<string, Promise<{ txt: string } | { blocked: "unreachable" | "server-error" }>>();
  return async (url: string): Promise<{ allowed: boolean; reason?: string }> => {
    const u = new URL(url);
    if (!cache.has(u.origin)) {
      cache.set(
        u.origin,
        fetcher(`${u.origin}/robots.txt`, { maxBytes: 500_000, accept: "text/plain,*/*" })
          .then((r) => (r.status >= 500 ? { blocked: "server-error" as const } : { txt: r.status >= 400 ? "" : r.body }))
          .catch(() => ({ blocked: "unreachable" as const })),
      );
    }
    const r = await cache.get(u.origin)!;
    if ("blocked" in r) {
      return {
        allowed: false,
        reason: r.blocked === "unreachable"
          ? "the site could not be reached."
          : "robots.txt returned a server error, so the site is treated as off-limits.",
      };
    }
    const ok = isAllowed(r.txt, AGENT_TOKEN, u.pathname + u.search);
    return ok ? { allowed: true } : { allowed: false, reason: `robots.txt disallows ${u.pathname}.` };
  };
}
