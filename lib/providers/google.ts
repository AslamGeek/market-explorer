import { distanceKm } from "../analysis";
import { getVertical, categorySimilarity } from "../verticals";
import type { Coordinates, Competitor } from "../model";
import { ProviderError, type SearchProvider } from "./types";
interface GooglePlace {
  id?: string; displayName?: {text?:string}; primaryType?: string; types?: string[];
  rating?: number; userRatingCount?: number; formattedAddress?: string;
  location?: Coordinates; currentOpeningHours?: {openNow?:boolean};
  attributions?: {provider?:string;providerUri?:string}[];
}
export const GOOGLE_FIELDS = ["places.id","places.displayName","places.primaryType","places.types","places.rating","places.userRatingCount","places.formattedAddress","places.location","places.currentOpeningHours.openNow","places.attributions"].join(",");
const numberOrNull=(value:unknown)=>typeof value === "number" && Number.isFinite(value) ? value : null;
export function normalizePlace(p: GooglePlace, center: Coordinates, business: string): Competitor | null {
  if (!p.id) return null;
  const latitude = numberOrNull(p.location?.latitude), longitude=numberOrNull(p.location?.longitude);
  return { placeId:p.id,name:p.displayName?.text || "Unnamed business",primaryType:p.primaryType || "unknown",rating:numberOrNull(p.rating),userRatingCount:numberOrNull(p.userRatingCount),formattedAddress:p.formattedAddress || "Address unavailable",latitude,longitude,
    openNow:typeof p.currentOpeningHours?.openNow === "boolean" ? p.currentOpeningHours.openNow : null,
    distance:latitude != null && longitude != null ? distanceKm(center,{latitude,longitude}) : null,
    similarity:categorySimilarity([p.primaryType || "",...(p.types || [])],getVertical(business)),
    attributions:(p.attributions || []).filter(a=>a.provider).map(a=>({provider:a.provider!,providerUri:a.providerUri?.startsWith("https://")?a.providerUri:undefined})),
  };
}
export function googleProvider(apiKey: string, fetcher: typeof fetch = fetch): SearchProvider {
  async function request<T>(url: string, init: RequestInit):Promise<T> {
    let response: Response;
    try { response = await fetcher(url,{...init, cache:"no-store"}); }
    catch { throw new ProviderError("The location provider could not be reached. Please try again.",504); }
    if (response.status === 429) throw new ProviderError("Google's usage quota is currently unavailable. Please try later.",503,"GOOGLE_QUOTA");
    if (!response.ok) throw new ProviderError(response.status === 403 ? "Live search is unavailable. Check the Google API configuration and billing." : "Google could not complete this market analysis. Please try again.");
    try { return await response.json() as T; } catch { throw new ProviderError("The location provider returned an unreadable response."); }
  }
  return { id:"google",capabilities:{rawExport:false,persistentListings:false},async search(input, signal) {
    const requestSignal = signal || AbortSignal.timeout(25000);
    const geoUrl=new URL("https://maps.googleapis.com/maps/api/geocode/json");
    geoUrl.searchParams.set("address",input.location);geoUrl.searchParams.set("key",apiKey);
    const geo=await request<{status:string;results:{formatted_address?:string;partial_match?:boolean;geometry?:{location?:{lat:number;lng:number}}}[]}>(geoUrl.toString(),{signal:requestSignal});
    if (geo.status === "OVER_QUERY_LIMIT" || geo.status === "OVER_DAILY_LIMIT") throw new ProviderError("Google's geocoding quota is currently unavailable.",503,"GOOGLE_QUOTA");
    if (geo.status === "ZERO_RESULTS") throw new ProviderError("We couldn't locate that territory. Try a city and state, or a full address.",422,"INVALID_LOCATION");
    if (geo.status !== "OK") throw new ProviderError("Location lookup is unavailable. Check the Google API configuration and billing.");
    if (geo.results?.length !== 1 || geo.results[0].partial_match) throw new ProviderError("That location is ambiguous. Add a state, country, or a more specific address.",422,"INVALID_LOCATION");
    const result=geo.results[0], c=result.geometry?.location;
    if (typeof c?.lat !== "number" || typeof c?.lng !== "number") throw new ProviderError("No usable center was found for this location.",422,"INVALID_LOCATION");
    const center={latitude:c.lat,longitude:c.lng}, vertical=getVertical(input.business);
    const body=vertical ? {includedTypes:vertical.googleTypes,maxResultCount:20,rankPreference:"POPULARITY",locationRestriction:{circle:{center,radius:5000}}} : {textQuery:`${input.business} in ${result.formatted_address || input.location}`,pageSize:20,locationBias:{circle:{center,radius:5000}}};
    const data=await request<{places?:GooglePlace[];nextPageToken?:string}>(`https://places.googleapis.com/v1/places:${vertical?"searchNearby":"searchText"}`,{method:"POST",headers:{"Content-Type":"application/json","X-Goog-Api-Key":apiKey,"X-Goog-FieldMask":GOOGLE_FIELDS+(vertical?"":",nextPageToken")},body:JSON.stringify(body),signal:requestSignal});
    const places:GooglePlace[]=Array.isArray(data.places) ? data.places : [];
    const relevant=places.filter(p=>!vertical || [...(p.types || []),p.primaryType || ""].some(t=>vertical.googleTypes.includes(t)));
    const normalized=relevant.map(p=>normalizePlace(p,center,input.business)).filter((p):p is Competitor=>p !== null);
    const inRadius=normalized.filter(p=>p.distance != null ? p.distance <= 5 : !!vertical);
    const competitors=[...new Map(inRadius.map(p=>[p.placeId,p])).values()];
    const warnings:string[]=[];
    if (!vertical) warnings.push("Free-text matches are unverified category matches. Review their subtypes before comparing.");
    if (competitors.some(p=>p.rating == null || p.userRatingCount == null || p.distance == null)) warnings.push("Some listings have incomplete data. Unknown values are excluded from the affected metrics.");
    return {source:"google",business:input.business,location:result.formatted_address || input.location,center,competitors,fetchedAt:new Date().toISOString(),capped:places.length >= 20 || !!data.nextPageToken,warnings};
  }};
}
