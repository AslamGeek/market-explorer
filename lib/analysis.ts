import type { Competitor, Coordinates, Filters, Sort, Strength } from "./model";
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const rad = Math.PI / 180;
  const h = Math.sin((b.latitude-a.latitude)*rad/2)**2 + Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin((b.longitude-a.longitude)*rad/2)**2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0,1-h)));
}
// Transparent, intentionally small heuristic. Missing values contribute zero.
export function scoreCompetitor(p: Competitor): { score: number; strength: Strength; parts: Record<string,number> } {
  const parts = {
    category: p.similarity === "direct" ? 30 : p.similarity === "adjacent" ? 15 : 10,
    distance: p.distance == null ? 0 : p.distance <= 1 ? 25 : p.distance <= 3 ? 15 : p.distance <= 5 ? 5 : 0,
    rating: p.rating == null ? 0 : p.rating >= 4.5 ? 20 : p.rating >= 4 ? 15 : p.rating >= 3.5 ? 8 : 0,
    reviews: p.userRatingCount == null ? 0 : p.userRatingCount >= 200 ? 25 : p.userRatingCount >= 50 ? 15 : p.userRatingCount >= 10 ? 5 : 0,
  };
  const score = Object.values(parts).reduce((a,b)=>a+b,0);
  return { score, strength: score >= 75 ? "Strong" : score >= 45 ? "Moderate" : "Emerging", parts };
}
export function filterCompetitors(rows: Competitor[], f: Filters, sort: Sort): Competitor[] {
  const q = f.text.trim().toLowerCase();
  return rows.filter(p => (!q || `${p.name} ${p.formattedAddress} ${p.primaryType.replaceAll("_"," ")}`.toLowerCase().includes(q))
    && (p.distance == null ? f.distance === 5 : p.distance <= f.distance)
    && (!f.rating || (p.rating != null && p.rating >= f.rating))
    && (!f.reviews || (p.userRatingCount != null && p.userRatingCount >= f.reviews))
    && (!f.openNow || p.openNow === true)
    && (f.strength === "all" || scoreCompetitor(p).strength === f.strength)
    && (f.subtype === "all" || p.primaryType === f.subtype))
    .sort((a,b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "distance" ? (a.distance ?? Infinity)-(b.distance ?? Infinity) : sort === "rating" ? (b.rating ?? -1)-(a.rating ?? -1) : (b.userRatingCount ?? -1)-(a.userRatingCount ?? -1)) || a.name.localeCompare(b.name));
}
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a,b)=>a-b), mid = Math.floor(sorted.length/2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
}
export function summarize(rows: Competitor[]) {
  const rated = rows.filter(p=>p.rating != null);
  return { total: rows.length, direct: rows.filter(p=>p.similarity === "direct").length, rated: rated.length,
    average: rated.length ? rated.reduce((s,p)=>s+p.rating!,0)/rated.length : null,
    median: median(rows.flatMap(p=>p.userRatingCount == null ? [] : [p.userRatingCount])),
    highlyRated: rows.filter(p=>p.rating != null && p.rating >= 4.5).length,
    strong: rows.filter(p=>scoreCompetitor(p).strength === "Strong").length,
    within1: rows.filter(p=>p.distance != null && p.distance <= 1).length,
    within3: rows.filter(p=>p.distance != null && p.distance <= 3).length };
}
export function getInsights(rows: Competitor[]): { title: string; detail: string }[] {
  const insights: {title:string;detail:string}[] = [];
  if (rows.length < 3) return insights;
  const close = rows.filter(p=>p.distance != null && p.distance <= 1);
  const strongClose = close.filter(p=>scoreCompetitor(p).strength === "Strong");
  if (strongClose.length >= 3 && strongClose.length/close.length >= .5) insights.push({title:"An established inner market",detail:`${strongClose.length} of ${close.length} visible competitors within 1 km have a strong listing presence.`});
  const rated=rows.filter(p=>p.rating != null), band=rated.filter(p=>p.rating! >= 4 && p.rating! < 4.5);
  if (band.length >= 3 && band.length > rated.length/2) insights.push({title:"A consistent rating benchmark",detail:`${band.length} of ${rated.length} rated competitors sit between 4.0 and 4.4 stars.`});
  const reviewed = rows.filter(p=>p.userRatingCount != null).sort((a,b)=>b.userRatingCount!-a.userRatingCount!);
  const top = reviewed.slice(0,Math.max(1,Math.ceil(reviewed.length*.2)));
  const total = reviewed.reduce((s,p)=>s+p.userRatingCount!,0), share=total ? top.reduce((s,p)=>s+p.userRatingCount!,0)/total : 0;
  if(reviewed.length >= 5 && share >= .6) insights.push({title:"Review activity is concentrated",detail:`${top.length} competitors account for ${Math.round(share*100)}% of the reviews in this view.`});
  return insights;
}
