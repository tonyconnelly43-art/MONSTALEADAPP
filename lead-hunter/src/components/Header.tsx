"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crosshair } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/rubric", label: "Scoring rubric" },
  { href: "/setup", label: "Setup & API keys" },
];

export function Header() {
  const path = usePathname();
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
      </div>
    </header>
  );
}
