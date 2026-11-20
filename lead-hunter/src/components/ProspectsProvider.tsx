"use client";
import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import type { Prospect } from "@/lib/types";
import type { ProspectStore } from "@/lib/store/types";
import { createLocalStore } from "@/lib/store/localStore";

interface Ctx {
  prospects: Prospect[];
  store: ProspectStore | null;
  ready: boolean;
}

const ProspectsContext = createContext<Ctx>({ prospects: [], store: null, ready: false });

// One browser-side store per page load. localStorage is browser-only, so it is never read during SSR.
let clientStore: ProspectStore | null = null;
const getStore = () => (clientStore ??= createLocalStore());

const EMPTY: Prospect[] = [];
const noopSubscribe = () => () => {};

export function ProspectsProvider({ children }: { children: React.ReactNode }) {
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const prospects = useSyncExternalStore(
    (cb) => getStore().subscribe(cb),
    () => getStore().list(),
    () => EMPTY,
  );
  const value = useMemo(() => ({ prospects, store: ready ? getStore() : null, ready }), [prospects, ready]);
  return <ProspectsContext.Provider value={value}>{children}</ProspectsContext.Provider>;
}

export const useProspects = () => useContext(ProspectsContext);
