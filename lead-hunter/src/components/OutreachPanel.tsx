"use client";
import { useState } from "react";
import { AlertTriangle, Check, Copy, FileText, Loader2, Lock, Mail, Sparkles } from "lucide-react";
import { PROSPECT_STATUSES, type Prospect } from "@/lib/types";
import type { ScoreResult } from "@/lib/scoring/rubric";
import { FINDING_META } from "@/lib/findings";
import { requestOutreach, type DraftCostEstimate } from "@/lib/store/outreach";
import { useProspects } from "./ProspectsProvider";

const approvedIdx = PROSPECT_STATUSES.indexOf("Approved for Outreach");

export function OutreachPanel({ prospect, score }: { prospect: Prospect; score: ScoreResult }) {
  const { store, config } = useProspects();
  const [busy, setBusy] = useState<"template" | "ai" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<DraftCostEstimate | null>(null);
  const o = prospect.outreach;

  async function generate(mode: "template" | "ai", confirm = false) {
    if (!store) return;
    setBusy(mode);
    setError(null);
    try {
      const r = await requestOutreach(store, prospect, mode, confirm);
      if ("estimate" in r) setEstimate(r.estimate);
      else setEstimate(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!score.qualified && !o) {
    return (
      <p className="text-sm text-ink-300">
        Audits and drafts are generated for qualified prospects only. {score.qualifyReason}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-ghost py-1 text-xs" disabled={busy !== null} onClick={() => generate("template")}>
          {busy === "template" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
          {o ? "Regenerate from template" : "Generate audit & draft (free)"}
        </button>
        {config?.aiDrafts ? (
          <button className="btn-ghost py-1 text-xs" disabled={busy !== null} onClick={() => generate("ai")}>
            {busy === "ai" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {o?.method === "ai" ? "Rewrite with Claude" : "Write with Claude"}
          </button>
        ) : (
          <span className="text-xs text-ink-500">Claude drafts: add ANTHROPIC_API_KEY to enable (optional).</span>
        )}
      </div>

      {estimate && (
        <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm" role="alertdialog" aria-label="Confirm Claude draft">
          <p className="text-amber-200">{estimate.explanation}</p>
          <div className="mt-2 flex gap-2">
            <button className="btn-primary py-1 text-xs" disabled={busy !== null} onClick={() => generate("ai", true)}>Confirm &amp; write</button>
            <button className="btn-ghost py-1 text-xs" onClick={() => setEstimate(null)}>Cancel</button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-brand-400" role="alert">{error}</p>}
      {o && <OutreachView key={`${o.generatedAt}-${o.editedAt ?? ""}`} prospect={prospect} currentScore={score.total} />}
    </div>
  );
}

function OutreachView({ prospect, currentScore }: { prospect: Prospect; currentScore: number }) {
  const { store } = useProspects();
  const o = prospect.outreach!;
  const [subject, setSubject] = useState(o.draft.subject);
  const [body, setBody] = useState(o.draft.body);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const dirty = subject !== o.draft.subject || body !== o.draft.body;
  const placeholders = /\[Your [^\]]+\]/.test(`${subject}\n${body}`);
  const statusIdx = PROSPECT_STATUSES.indexOf(prospect.status);
  const approved = statusIdx >= approvedIdx || prospect.statusHistory.some((h) => h.status === "Approved for Outreach");
  const canUse = approved && !prospect.isFictional && !dirty;
  const lockReason = prospect.isFictional
    ? "Fictional sample business: never send."
    : !approved
      ? "Approve this prospect for outreach to copy or open the draft."
      : dirty
        ? "Save your edits first."
        : null;

  async function save() {
    if (!store) return;
    setSaving(true);
    try {
      await store.update(prospect.id, { draft: { subject, body } });
      setSaveMsg("Saved.");
    } catch (e) {
      setSaveMsg(`Could not save: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // mailto: opens YOUR email app with the draft; nothing is sent until you press Send there.
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="space-y-4">
      {o.isFictional && (
        <div className="flex gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> FICTIONAL: this audit and draft describe an invented business, for demonstration only.
        </div>
      )}
      <p className="text-xs text-ink-500">
        {o.method === "ai" ? `Written by Claude (${o.model})` : "Template draft"} · {new Date(o.generatedAt).toLocaleString()} · score {o.score}/100 · rubric {o.rubricVersion}
        {o.editedAt ? ` · edited ${new Date(o.editedAt).toLocaleString()}` : ""}
        {o.score !== currentScore && <span className="text-amber-300"> · The score is now {currentScore}. Consider regenerating.</span>}
      </p>

      {/* Mini audit */}
      <div className="rounded-lg border border-ink-700 p-3">
        <h4 className="text-sm font-bold">Mini brand audit</h4>
        <p className="mt-1 text-sm text-ink-100">{o.audit.headline}</p>
        {o.audit.opportunities.length > 0 && (
          <>
            <h5 className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-300">Opportunities (observed)</h5>
            <ul className="mt-1 space-y-1.5 text-sm">
              {o.audit.opportunities.map((i) => (
                <li key={i.findingKey}>
                  {i.text}
                  <span className="block text-xs text-ink-500">Evidence ({FINDING_META[i.findingKey].label}): {i.evidence ?? "none recorded"}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {o.audit.strengths.length > 0 && (
          <>
            <h5 className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-300">Already working</h5>
            <p className="text-sm text-ink-300">{o.audit.strengths.map((s) => s.text).join(" · ")}</p>
          </>
        )}
        <h5 className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-300">Recommended services</h5>
        <ul className="mt-1 space-y-1 text-sm">
          {o.audit.recommendedServices.map((r) => (
            <li key={r.service}><span className="font-medium">{r.service}</span> <span className="text-ink-300">({r.why})</span></li>
          ))}
        </ul>
        <h5 className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-300">Uncertain / not checked</h5>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-ink-300">
          {o.audit.uncertainties.map((u) => <li key={u}>{u}</li>)}
        </ul>
      </div>

      {/* Draft */}
      <div className="space-y-2">
        <h4 className="text-sm font-bold">Outreach draft <span className="font-normal text-ink-500">(edit freely; nothing is sent by this app)</span></h4>
        <label className="label" htmlFor="draft-subject">Subject</label>
        <input id="draft-subject" className="field" value={subject} onChange={(e) => { setSubject(e.target.value); setSaveMsg(null); }} />
        <label className="label" htmlFor="draft-body">Body</label>
        <textarea id="draft-body" rows={14} className="field font-mono text-[13px] leading-relaxed" value={body} onChange={(e) => { setBody(e.target.value); setSaveMsg(null); }} />
        {placeholders && <p className="text-xs text-amber-300">Replace the [Your …] placeholders, or set SENDER_NAME, SENDER_PHONE, SENDER_EMAIL and SENDER_ADDRESS so drafts fill them in.</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-ghost py-1 text-xs" disabled={!dirty || saving} onClick={save}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save edits</button>
          <button className="btn-ghost py-1 text-xs" disabled={!canUse} onClick={copy} title={lockReason ?? undefined}>
            {canUse ? (copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />) : <Lock className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy draft"}
          </button>
          {canUse ? (
            <a className="btn-ghost py-1 text-xs" href={mailto}><Mail className="h-3.5 w-3.5" /> Open in my email app</a>
          ) : (
            <button className="btn-ghost py-1 text-xs" disabled title={lockReason ?? undefined}><Lock className="h-3.5 w-3.5" /> Open in my email app</button>
          )}
          {saveMsg && <span className="text-xs text-ink-300">{saveMsg}</span>}
        </div>
        {lockReason && <p className="text-xs text-ink-500">{lockReason}</p>}
        {canUse && <p className="text-xs text-ink-500">After you send it yourself, mark the prospect as &ldquo;Contacted&rdquo; above.</p>}
      </div>
    </div>
  );
}
