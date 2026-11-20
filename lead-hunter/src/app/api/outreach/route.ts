import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getRepo } from "@/lib/server";
import { prospectSchema } from "@/lib/validation";
import { scoreProspect } from "@/lib/scoring/rubric";
import { generateTemplateOutreach } from "@/lib/outreach/template";
import { AiDraftError, aiCostEstimate, generateAiOutreach } from "@/lib/outreach/ai";
import { senderInfo } from "@/lib/outreach/sender";
import type { Prospect } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  mode: z.enum(["template", "ai"]),
  confirmBillable: z.boolean().default(false),
  id: z.string().max(300).optional(),
  prospect: prospectSchema.optional(), // browser-storage mode
});

/** Generates a mini audit + outreach draft. Never sends anything. */
export async function POST(req: Request) {
  const denied = await requireAuth();
  if (denied) return denied;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { mode, confirmBillable } = parsed.data;

  const repo = getRepo();
  let prospect: Prospect | null;
  if (repo) {
    if (!parsed.data.id) return NextResponse.json({ error: "Send the prospect id." }, { status: 400 });
    prospect = await repo.get(parsed.data.id);
  } else {
    prospect = (parsed.data.prospect as Prospect | undefined) ?? null;
  }
  if (!prospect) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const score = scoreProspect(prospect);
  if (!score.qualified) {
    return NextResponse.json({ error: `Drafts are only generated for qualified prospects. ${score.qualifyReason}` }, { status: 400 });
  }
  if (prospect.contentExpired) return NextResponse.json({ error: "Google details expired. Refresh them first." }, { status: 400 });

  let outreach;
  if (mode === "template") {
    outreach = generateTemplateOutreach(prospect, score, senderInfo());
  } else {
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set. Use the free template draft." }, { status: 400 });
    if (!confirmBillable) return NextResponse.json({ error: "Confirmation required", estimate: aiCostEstimate() }, { status: 409 });
    try {
      outreach = await generateAiOutreach(prospect, score, senderInfo());
    } catch (err) {
      if (err instanceof AiDraftError) return NextResponse.json({ error: err.message }, { status: 422 });
      if (err instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: "Claude rejected the API key. Check ANTHROPIC_API_KEY." }, { status: 502 });
      if (err instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "Claude rate limit reached. Try again in a minute." }, { status: 429 });
      if (err instanceof Anthropic.APIConnectionError) return NextResponse.json({ error: "Couldn't reach Claude. Check the network and try again, or use the template draft." }, { status: 502 });
      if (err instanceof Anthropic.APIError) return NextResponse.json({ error: `Claude API error ${err.status ?? ""}. Try again or use the template draft.` }, { status: 502 });
      console.error("ai draft failed", err);
      return NextResponse.json({ error: "Draft generation failed." }, { status: 502 });
    }
  }

  if (repo) return NextResponse.json({ prospect: await repo.setOutreach(prospect.id, outreach) });
  return NextResponse.json({ outreach });
}
