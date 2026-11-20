import type { Metadata } from "next";
import Link from "next/link";
import { authMode } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in · MONSTA Lead Hunter" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const mode = authMode();
  // Only allow same-site relative redirects.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <div className="mx-auto mt-16 max-w-sm">
      <div className="card p-6">
        <h1 className="text-xl font-black">Sign in</h1>
        {mode === "locked" ? (
          <p className="mt-2 text-sm text-ink-300">
            This deployment is locked because <code>APP_PASSWORD</code> is not set. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.
          </p>
        ) : mode === "open" ? (
          <p className="mt-2 text-sm text-ink-300">No password is configured for this local environment. <Link href="/" className="text-sky-300 hover:underline">Continue to the dashboard</Link>.</p>
        ) : (
          <LoginForm next={safeNext} />
        )}
      </div>
    </div>
  );
}
