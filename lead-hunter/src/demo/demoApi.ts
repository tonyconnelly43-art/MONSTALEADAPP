/**
 * In-browser replacement for the app's API routes, used only by the standalone demo page.
 * Sample (fictional) data and free template drafts only: no network, no keys, no paid calls.
 */
import { sampleProvider } from "@/lib/discovery/sampleProvider";
import { discoverRequestSchema, ALL_INDUSTRIES } from "@/lib/discovery/query";
import { dedupe } from "@/lib/discovery/dedupe";
import { toProspect } from "@/lib/prospects";
import { scoreProspect } from "@/lib/scoring/rubric";
import { generateTemplateOutreach } from "@/lib/outreach/template";
import type { Prospect } from "@/lib/types";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

async function handle(path: string, init?: RequestInit): Promise<Response> {
  const body = init?.body ? JSON.parse(String(init.body)) : null;
  switch (path) {
    case "/api/config":
      return json({ storage: "browser", auth: "open", googleRetentionDays: 30, aiDrafts: false, aiModel: null });
    case "/api/providers":
      return json({
        providers: [
          { id: "sample", label: sampleProvider.label, isLive: false, available: true },
          { id: "google_places", label: "Google Places API (live)", isLive: true, available: false, unavailableReason: "Not available in the demo. Deploy the app and add a Google key for live search." },
        ],
      });
    case "/api/discover": {
      const parsed = discoverRequestSchema.safeParse(body);
      if (!parsed.success) return json({ error: "Invalid search", issues: parsed.error.issues }, 400);
      if (parsed.data.provider !== "sample") return json({ error: "Live search isn't available in the demo." }, 400);
      const q = parsed.data.query;
      const result = await sampleProvider.search(q);
      const { unique, duplicates } = dedupe(result.businesses);
      const limited = unique.slice(0, q.limit);
      const prospects = limited.map((b) =>
        toProspect(b, result.industryBySourceId[b.sourceId] ?? (q.industry === ALL_INDUSTRIES ? (b.category ?? "Unknown") : q.industry), result.enrichments?.[b.sourceId]),
      );
      return json({ prospects, duplicatesRemoved: duplicates, saved: null, notes: result.notes, billableRequestsMade: 0, fromCache: false });
    }
    case "/api/outreach": {
      const p = body?.prospect as Prospect | undefined;
      if (!p) return json({ error: "Missing prospect" }, 400);
      if (body.mode !== "template") return json({ error: "Claude drafts aren't available in the demo." }, 400);
      const score = scoreProspect(p);
      if (!score.qualified) return json({ error: `Drafts are only generated for qualified prospects. ${score.qualifyReason}` }, 400);
      const sender = { name: null, company: "Monsta Media & Design", email: null, phone: null, address: null, region: "Northeast Ohio" };
      return json({ outreach: generateTemplateOutreach(p, score, sender) });
    }
    case "/api/analyze":
      return json({ error: "Website analysis needs the deployed app (it fetches real websites)." }, 400);
    default:
      return json({ error: "Not available in the demo." }, 404);
  }
}

export function installDemoApi() {
  const real = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.startsWith("/api/")) return handle(url.split("?")[0], init);
    return real(input, init);
  };
}
