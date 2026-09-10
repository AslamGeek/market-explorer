export type Strength = "Strong" | "Moderate" | "Emerging";
export type Similarity = "direct" | "adjacent" | "unverified";
export interface Coordinates { latitude: number; longitude: number }
export interface Competitor {
  placeId: string; name: string; primaryType: string; rating: number | null;
  userRatingCount: number | null; formattedAddress: string;
  latitude: number | null; longitude: number | null; openNow: boolean | null;
  distance: number | null; similarity: Similarity;
  attributions: { provider: string; providerUri?: string }[];
}
export interface Market {
  source: "google" | "sample"; business: string; location: string;
  center: Coordinates; competitors: Competitor[]; fetchedAt: string;
  capped: boolean; warnings: string[]; remaining?: number;
}
export interface Filters { text: string; distance: number; rating: number; reviews: number; openNow: boolean; strength: string; subtype: string }
export type Sort = "distance" | "rating" | "reviews" | "name";
export const defaultFilters: Filters = { text: "", distance: 5, rating: 0, reviews: 0, openNow: false, strength: "all", subtype: "all" };
export const typeLabel = (type: string) => type.replaceAll("_", " ").replace(/^./, c => c.toUpperCase());
