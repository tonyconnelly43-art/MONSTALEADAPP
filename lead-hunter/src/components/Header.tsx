"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crosshair, LogOut } from "lucide-react";
import { useProspects } from "./ProspectsProvider";
import { hardNavigate } from "@/lib/navigate";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/rubric", label: "Scoring rubric" },
  { href: "/setup", label: "Setup & API keys" },
];

export function Header() {
  const path = usePathname();
  const { config } = useProspects();
  if (path === "/login") return <LoginHeader />;
  return (
    <header className="sticky top-0 z-30 border-b border-ink-700 bg-ink-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-500">
            <Crosshair className="h-5 w-5 text-white" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-black tracking-wider">MONSTA LEAD HUNTER</span>
            <span className="block text-[11px] text-ink-300">Monsta Media &amp; Design</span>
          </span>
        </Link>
        <nav className="flex gap-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-md px-3 py-1.5 ${path === n.href ? "bg-ink-800 text-white" : "text-ink-300 hover:text-white"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        {config?.auth === "password" && (
          <button
            className="ml-auto inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-ink-300 hover:text-white"
            onClick={async () => {
              await fetch("/api/logout", { method: "POST" });
              hardNavigate("/login");
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        )}
      </div>
    </header>
  );
}

function LoginHeader() {
  return (
    <header className="border-b border-ink-700">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:px-6">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-500"><Crosshair className="h-5 w-5 text-white" aria-hidden /></span>
        <span className="text-sm font-black tracking-wider">MONSTA LEAD HUNTER</span>
      </div>
    </header>
  );
}
