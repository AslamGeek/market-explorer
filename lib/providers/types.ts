import type { Market } from "../model";
export interface SearchProvider {
  id: string;
  capabilities: { rawExport: boolean; persistentListings: boolean };
  search(input: { business: string; location: string }, signal?: AbortSignal): Promise<Market>;
}
export class ProviderError extends Error {
  constructor(message: string, public status = 502, public code = "PROVIDER_ERROR") { super(message); }
}
