import "server-only";
import type { ProviderId } from "../types";
import type { DiscoveryProvider } from "./provider";
import { sampleProvider } from "./sampleProvider";
import { createGooglePlacesProvider } from "./googlePlaces";
import { createMemoryCounter, createUsageGuard } from "./usageGuard";
import { getDb, isDbConfigured } from "../db/client";
import { createDbCounter } from "../repo/usageCounter";

// Module-level so the cache persists across requests within one server instance. The daily
// request counter lives in Postgres when configured, so the cap holds across instances.
const placesGuard = createUsageGuard({
  dailyCap: Number(process.env.PLACES_DAILY_REQUEST_CAP) || 20,
  counter: isDbConfigured() ? createDbCounter(getDb(), "google_places") : createMemoryCounter(),
});
export const googlePlaces = createGooglePlacesProvider({ apiKey: process.env.GOOGLE_PLACES_API_KEY, guard: placesGuard });

/**
 * Provider registry. Add new legitimate sources here (e.g. Yelp Fusion, state contractor-license
 * registries) without touching the UI.
 */
const providers: Partial<Record<ProviderId, DiscoveryProvider>> = {
  sample: sampleProvider,
  google_places: googlePlaces,
};

export function getProvider(id: ProviderId): DiscoveryProvider | undefined {
  return providers[id];
}

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  isLive: boolean;
  available: boolean;
  unavailableReason?: string;
}

export function listProviders(): ProviderInfo[] {
  return [
    { id: "sample", label: sampleProvider.label, isLive: false, available: true },
    {
      id: "google_places",
      label: googlePlaces.label,
      isLive: true,
      available: googlePlaces.isConfigured(),
      unavailableReason: googlePlaces.isConfigured() ? undefined : "Add GOOGLE_PLACES_API_KEY on the server to enable live search.",
    },
  ];
}
