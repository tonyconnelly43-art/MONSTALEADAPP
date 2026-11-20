import { describe, expect, it } from "vitest";
import { dedupe, normalizeDomain, normalizePhone } from "./discovery/dedupe";
import { SAMPLE_RECORDS } from "./discovery/sampleData";
import { sampleProvider } from "./discovery/sampleProvider";
import { ALL_INDUSTRIES } from "./discovery/query";
import { scoreProspect, OPPORTUNITY_MAX } from "./scoring/rubric";
import { toProspect } from "./prospects";
import { canTransition } from "./status";

const prospectFor = (id: string) => {
  const r = SAMPLE_RECORDS.find((x) => x.business.sourceId === `sample-${id}`)!;
  return toProspect(r.business, r.industry, { analysis: r.analysis, chainSuspected: r.chainSuspected });
};

describe("dedupe", () => {
  it("normalizes phones and domains", () => {
    expect(normalizePhone("+1 (330) 555-0101")).toBe("3305550101");
    expect(normalizeDomain("http://www.Example.com/path")).toBe("example.com");
  });
  it("drops the intentional sample duplicate (same phone/domain)", () => {
    const { unique, duplicates } = dedupe(SAMPLE_RECORDS.map((r) => r.business));
    expect(duplicates).toBe(1);
    expect(unique.find((b) => b.sourceId === "sample-13")).toBeUndefined();
  });
  it("dedupes against existing records", () => {
    const all = SAMPLE_RECORDS.map((r) => r.business);
    expect(dedupe(all, all).unique).toHaveLength(0);
  });
  it("does not treat shared social domains as identity", () => {
    const a = { ...SAMPLE_RECORDS[10].business, sourceId: "a", phone: null, name: "Alpha" };
    const b = { ...a, sourceId: "b", name: "Beta" };
    expect(dedupe([a, b]).unique).toHaveLength(2);
  });
});

describe("sample provider", () => {
  it("only serves the pilot area and labels everything fictional", async () => {
    const r = await sampleProvider.search({ city: "Hudson", state: "OH", radiusMiles: 15, industry: ALL_INDUSTRIES, limit: 25 });
    expect(r.businesses.length).toBeGreaterThan(0);
    expect(r.businesses.every((b) => b.isFictional && b.name.includes("(Sample)"))).toBe(true);
    expect(r.billableRequestsMade).toBe(0);
    const out = await sampleProvider.search({ city: "Austin", state: "TX", radiusMiles: 15, industry: "HVAC", limit: 25 });
    expect(out.businesses).toHaveLength(0);
  });
});

describe("rubric", () => {
  it("opportunity weights sum to 60", () => expect(OPPORTUNITY_MAX).toBe(60));
  it("scores a weak-site independent business as qualified", () => {
    const s = scoreProspect(prospectFor("3"));
    expect(s.qualified).toBe(true);
    expect(s.total).toBe(s.opportunity + s.fit);
  });
  it("scores a polished site low on opportunity", () => {
    expect(scoreProspect(prospectFor("2")).opportunity).toBe(0);
  });
  it("never awards points for unknown findings and flags low completeness", () => {
    const s = scoreProspect(prospectFor("7")); // site failed to fetch
    expect(s.opportunity).toBe(0);
    expect(s.qualified).toBe(false);
    expect(s.completeness).toBeLessThan(0.6);
  });
});

describe("outreach gate", () => {
  it("blocks Contacted until approved", () => {
    const p = prospectFor("1");
    expect(canTransition(p, "Contacted").ok).toBe(false);
    const approved = { ...p, status: "Approved for Outreach" as const, statusHistory: [...p.statusHistory, { status: "Approved for Outreach" as const, at: "x" }] };
    expect(canTransition(approved, "Contacted").ok).toBe(true);
    expect(canTransition({ ...approved, status: "Reviewed" }, "Meeting Booked").ok).toBe(true);
  });
});
