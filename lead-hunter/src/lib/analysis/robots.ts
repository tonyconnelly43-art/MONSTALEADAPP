/**
 * Minimal robots.txt (RFC 9309) evaluation: user-agent groups, Allow/Disallow with longest-match
 * precedence (Allow wins ties), and * / $ wildcards.
 */
interface Rule { allow: boolean; pattern: string }

export function parseRobots(txt: string): Map<string, Rule[]> {
  const groups = new Map<string, Rule[]>();
  let agents: string[] = [];
  let lastWasAgent = false;
  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (field === "user-agent") {
      if (!lastWasAgent) agents = [];
      const ua = value.toLowerCase();
      agents.push(ua);
      if (!groups.has(ua)) groups.set(ua, []);
      lastWasAgent = true;
    } else if (field === "allow" || field === "disallow") {
      lastWasAgent = false;
      if (field === "disallow" && value === "") continue; // empty Disallow = allow all
      for (const a of agents) groups.get(a)!.push({ allow: field === "allow", pattern: value });
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

function toRegex(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

/** `agentToken` is our product token, e.g. "monstaleadhunter". */
export function isAllowed(robotsTxt: string, agentToken: string, pathAndQuery: string): boolean {
  const groups = parseRobots(robotsTxt);
  const token = agentToken.toLowerCase();
  const key = [...groups.keys()].find((k) => k !== "*" && token.includes(k)) ?? (groups.has("*") ? "*" : null);
  if (!key) return true;
  let best: Rule | null = null;
  for (const r of groups.get(key)!) {
    if (!toRegex(r.pattern).test(pathAndQuery)) continue;
    if (!best || r.pattern.length > best.pattern.length || (r.pattern.length === best.pattern.length && r.allow)) best = r;
  }
  return best ? best.allow : true;
}
