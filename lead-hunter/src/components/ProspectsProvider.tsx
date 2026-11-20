"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { Prospect } from "@/lib/types";
import type { ProspectStore, StorageMode } from "@/lib/store/types";
import { createLocalStore } from "@/lib/store/localStore";
import { createRemoteStore } from "@/lib/store/remoteStore";
import { goToLogin } from "@/lib/navigate";
import { usePathname } from "next/navigation";

export interface AppConfig {
  storage: StorageMode;
  auth: "password" | "locked" | "open";
  googleRetentionDays: number;
}

interface Ctx {
  prospects: Prospect[];
  store: ProspectStore | null;
  config: AppConfig | null;
  ready: boolean;
  loadError: string | null;
}

const ProspectsContext = createContext<Ctx>({ prospects: [], store: null, config: null, ready: false, loadError: null });
const EMPTY: Prospect[] = [];

export function ProspectsProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<ProspectStore | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const onLoginPage = usePathname() === "/login";

  useEffect(() => {
    if (onLoginPage) return; // nothing to load before sign-in
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/config");
        if (res.status === 401) {
          goToLogin();
          return;
        }
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not load settings.");
        const cfg = (await res.json()) as AppConfig;
        const s = cfg.storage === "database" ? createRemoteStore() : createLocalStore();
        await s.reload();
        if (!cancelled) {
          setConfig(cfg);
          setStore(s);
        }
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onLoginPage]);

  const subscribe = useCallback((cb: () => void) => (store ? store.subscribe(cb) : () => {}), [store]);
  const prospects = useSyncExternalStore(subscribe, () => (store ? store.list() : EMPTY), () => EMPTY);

  const value = useMemo(
    () => ({ prospects, store, config, ready: store !== null, loadError }),
    [prospects, store, config, loadError],
  );
  return <ProspectsContext.Provider value={value}>{children}</ProspectsContext.Provider>;
}

export const useProspects = () => useContext(ProspectsContext);
