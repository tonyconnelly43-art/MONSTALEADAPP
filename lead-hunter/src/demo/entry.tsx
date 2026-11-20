import { createRoot } from "react-dom/client";
import { useState } from "react";
import { Crosshair, FlaskConical } from "lucide-react";
import { installDemoApi } from "./demoApi";
import { ProspectsProvider } from "@/components/ProspectsProvider";
import { Dashboard } from "@/components/Dashboard";
import RubricPage from "@/app/rubric/page";

installDemoApi();

function DemoApp() {
  const [tab, setTab] = useState<"dashboard" | "rubric">("dashboard");
  return (
    <ProspectsProvider>
      <header className="demo-header sticky z-30 border-b border-ink-700 bg-ink-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-500"><Crosshair className="h-5 w-5 text-white" aria-hidden /></span>
            <span className="leading-tight">
              <span className="block text-sm font-black tracking-wider">MONSTA LEAD HUNTER</span>
              <span className="block text-[11px] text-ink-300">Monsta Media &amp; Design</span>
            </span>
          </div>
          <nav className="flex gap-1 text-sm">
            {([["dashboard", "Dashboard"], ["rubric", "Scoring rubric"]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`rounded-md px-3 py-1.5 ${tab === id ? "bg-ink-800 text-white" : "text-ink-300 hover:text-white"}`}>
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex gap-2 rounded-lg border border-sky-400/40 bg-sky-400/10 px-4 py-3 text-sm text-sky-200">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Demo:</strong> this page runs entirely in your browser with fictional sample businesses. Click <strong>Run search</strong> to start, then click a business to see its score, findings and an outreach draft. Live Google search, website analysis, the shared database and Claude drafts need the deployed app.
          </span>
        </div>
        {tab === "dashboard" ? <Dashboard /> : <RubricPage />}
      </main>
    </ProspectsProvider>
  );
}

createRoot(document.getElementById("root")!).render(<DemoApp />);
