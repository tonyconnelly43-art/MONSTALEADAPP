"use client";
import { useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { hardNavigate } from "@/lib/navigate";

export function LoginForm({ next }: { next: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Read the field directly so text typed before the page finished loading still counts.
      const value = (e.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>("#password")?.value ?? password;
      const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: value }) });
      if (res.ok) {
        hardNavigate(next);
        return;
      }
      setError((await res.json().catch(() => null))?.error ?? "Sign-in failed.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div>
        <label htmlFor="password" className="label">Team password</label>
        <input id="password" type="password" autoComplete="current-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
      </div>
      {error && <p className="text-sm text-brand-400" role="alert">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Sign in
      </button>
    </form>
  );
}
