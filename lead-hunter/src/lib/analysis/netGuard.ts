import { isIP } from "node:net";

/**
 * SSRF protection: website URLs come from third-party listings, so the server must never be
 * tricked into fetching internal addresses (cloud metadata, localhost, private networks).
 */
function v4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
}

const V4_BLOCKED: [string, number][] = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
];

function inV4Range(ip: string, [base, bits]: [string, number]): boolean {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (v4ToInt(ip) & mask) === (v4ToInt(base) & mask);
}

export function isBlockedIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return V4_BLOCKED.some((r) => inV4Range(ip, r));
  if (kind === 6) {
    const a = ip.toLowerCase();
    if (a === "::" || a === "::1") return true;
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedIp(mapped[1]);
    if (/^::ffff:[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(a)) return true; // hex-form mapped v4: block conservatively
    const first = parseInt(a.split(":")[0] || "0", 16);
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
    if ((first & 0xff00) === 0xff00) return true; // multicast
    if (a.startsWith("64:ff9b:")) return true; // NAT64
    if (a.startsWith("2001:db8:")) return true; // documentation
    return false;
  }
  return true; // not an IP at all
}

export class BlockedUrlError extends Error {}

/** Only plain http(s) on default ports, no embedded credentials, no IP-literal private hosts. */
export function assertFetchableUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BlockedUrlError(`Not a valid URL: ${raw}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new BlockedUrlError(`Unsupported protocol ${url.protocol}`);
  if (url.username || url.password) throw new BlockedUrlError("URLs with credentials are not fetched.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new BlockedUrlError(`Non-standard port ${url.port} is not fetched.`);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && isBlockedIp(host)) throw new BlockedUrlError("Private or reserved address.");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new BlockedUrlError("Local hostname.");
  }
  return url;
}
