import "server-only";
import type { ProviderId } from "../types";
import type { DiscoveryProvider } from "./provider";
import { sampleProvider } from "./sampleProvider";

/**
 * Provider registry. Add new legitimate sources here (Google Places in Milestone 2;
 * later e.g. Yelp Fusion, state contractor-license registries) without touching the UI.
 */
const providers: Partial<Record<ProviderId, DiscoveryProvider>> = {
  sample: sampleProvider,
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
      label: "Google Places API (live)",
      isLive: true,
      available: false,
      unavailableReason: "Coming in Milestone 2 — requires GOOGLE_PLACES_API_KEY on the server.",
    },
  ];
}
