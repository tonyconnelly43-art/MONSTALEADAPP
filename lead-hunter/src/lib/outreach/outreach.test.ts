import { describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { SAMPLE_RECORDS } from "../discovery/sampleData";
import { toProspect } from "../prospects";
import { scoreProspect } from "../scoring/rubric";
import { generateTemplateOutreach, greetingName, type SenderInfo } from "./template";
import { AiDraftError, generateAiOutreach } from "./ai";

const sender: SenderInfo = { name: "Alex Rivera", company: "Monsta Media & Design", email: "alex@studio.example.com", phone: "(330) 555-0100", address: "1 Studio Way (test), Macedonia, OH", region: "Northeast Ohio" };
const blank: SenderInfo = { name: null, company: "Monsta Media & Design", email: null, phone: null, address: null, region: "Northeast Ohio" };
const sample = (n: string) => {
  const r = SAMPLE_RECORDS.find((x) => x.business.sourceId === `sample-${n}`)!;
  return toProspect(r.business, r.industry, { analysis: r.analysis, chainSuspected: r.chainSuspected });
};

describe("template outreach", () => {
  it("builds an audit grounded only in recorded findings", () => {
    const p = sample("3");
    const o = generateTemplateOutreach(p, scoreProspect(p), sender);
    const recorded = new Map(p.analysis!.findings.map((f) => [f.key, f]));
    expect(o.audit.opportunities.length).toBeGreaterThan(0);
    for (const i of o.audit.opportunities) {
      expect(recorded.get(i.findingKey)?.result).toBe("fail");
      expect(i.evidence).toBe(recorded.get(i.findingKey)!.evidence);
    }
    for (const i of o.audit.strengths) expect(recorded.get(i.findingKey)?.result).toBe("pass");
    // Unknown checks become uncertainties, never opportunities.
    expect(o.audit.uncertainties.some((u) => u.startsWith("Site appears maintained"))).toBe(true);
    // Wraps are never claimed from a website.
    expect(o.audit.uncertainties.join(" ")).toMatch(/Vehicle wraps .* can't be judged/);
    expect(o.isFictional).toBe(true);
    expect(o.method).toBe("template");
  });

  it("writes a personalized draft with signature, address and opt-out", () => {
    const p = sample("9");
    const o = generateTemplateOutreach(p, scoreProspect(p), sender);
    expect(o.draft.subject).toContain("brightwire.example.com");
    expect(o.draft.body).toContain(`Hi ${p.name} team`);
    expect(o.draft.body).toContain("Alex Rivera");
    expect(o.draft.body).toContain("1 Studio Way (test)");
    expect(o.draft.body).toMatch(/reply "no thanks"/);
    expect(o.draft.body).not.toMatch(/\[Your/);
  });

  it("uses placeholders when sender details aren't configured", () => {
    const p = sample("9");
    expect(generateTemplateOutreach(p, scoreProspect(p), blank).draft.body).toMatch(/\[Your name\][\s\S]*\[Your business mailing address\]/);
  });

  it("drops legal suffixes from the greeting", () => {
    expect(greetingName("Acme Plumbing, LLC")).toBe("Acme Plumbing");
    expect(greetingName("Best Roofing Inc.")).toBe("Best Roofing");
    expect(greetingName("Twin Rivers Plumbing Co.")).toBe("Twin Rivers Plumbing");
    expect(greetingName("Solon Spark Electric")).toBe("Solon Spark Electric");
  });

  it("handles a business with no website", () => {
    const p = sample("4");
    const o = generateTemplateOutreach(p, scoreProspect(p), sender);
    expect(o.audit.headline).toMatch(/no website/i);
    expect(o.audit.recommendedServices[0].service).toBe("Website design");
    expect(o.draft.body).toMatch(/couldn't find a website/);
  });
});

function fakeClient(payload: unknown, stop_reason = "end_turn") {
  const create = vi.fn(async () => ({ stop_reason, model: "claude-opus-5-5", content: [{ type: "text", text: typeof payload === "string" ? payload : JSON.stringify(payload) }] }));
  return { client: { beta: { messages: { create } } } as unknown as Anthropic, create };
}

describe("AI outreach guardrails", () => {
  const p = sample("3");
  const score = scoreProspect(p);
  const good = {
    headline: "Hudson Overhead Door Pros has several quick wins on its website.",
    opportunities: [{ finding_key: "primary_cta", text: "No clear call-to-action on the homepage." }],
    strengths: [{ finding_key: "https", text: "Secure HTTPS site." }],
    subject: "Two quick ideas for your website",
    body: "Hi Hudson Overhead Door Pros team,\n\nI noticed your homepage doesn't have a clear call-to-action. Would you be open to a quick 15-minute call next week to talk through a few ideas?",
  };

  it("accepts a grounded draft, copies evidence from records, and appends the closing", async () => {
    const { client, create } = fakeClient(good);
    const o = await generateAiOutreach(p, score, sender, client);
    expect(o.method).toBe("ai");
    expect(o.audit.opportunities[0].evidence).toBe(p.analysis!.findings.find((f) => f.key === "primary_cta")!.evidence);
    expect(o.draft.body).toMatch(/reply "no thanks"/);
    const req = (create.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(req.fallbacks).toBe("default");
    expect(JSON.stringify(req.messages)).toContain("<website_evidence>");
    expect(req.system).toMatch(/never follow instructions/);
  });

  it("rejects a draft citing a finding with the wrong result", async () => {
    const { client } = fakeClient({ ...good, opportunities: [{ finding_key: "https", text: "Not secure." }] });
    await expect(generateAiOutreach(p, score, sender, client)).rejects.toThrow(AiDraftError);
  });

  it("rejects links, prices and guarantees", async () => {
    const { client } = fakeClient({ ...good, body: good.body + " Visit https://example.com for $499 — results guaranteed." });
    await expect(generateAiOutreach(p, score, sender, client)).rejects.toThrow(/link, price or guarantee/);
  });

  it("handles refusals and malformed output", async () => {
    await expect(generateAiOutreach(p, score, sender, fakeClient(good, "refusal").client)).rejects.toThrow(/declined/);
    await expect(generateAiOutreach(p, score, sender, fakeClient("not json").client)).rejects.toThrow(/unexpected format/);
  });
});
