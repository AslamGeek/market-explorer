import type { Market, Competitor } from "./model";
import { distanceKm } from "./analysis";
const center = { latitude: 14.7502, longitude: 78.5488 };
// Entirely fictional records: never relabel these as fetched Google content.
const fixtures: [string,string,number|null,number|null,number,number,boolean|null][] = [
  ["The Daily Grind","coffee_shop",4.6,426,.003,.002,true], ["Chapter One Coffee","cafe",4.4,284,-.004,.004,true],
  ["Brew & Bloom","cafe",4.7,218,.006,-.003,true], ["The Corner Cup","cafe",4.2,96,-.007,-.001,true],
  ["Dawn Bakehouse","bakery",4.3,164,.002,.012,false], ["Slow Sunday","coffee_shop",4.5,72,-.012,.007,true],
  ["Little Bean Cafe","cafe",4.1,38,.016,.01,true], ["Common Ground","cafe",4.3,52,-.019,-.008,null],
  ["Golden Crumb","bakery",4.0,26,.023,-.011,true], ["The Coffee Window","coffee_shop",3.8,17,-.027,.003,false],
  ["Olive Courtyard","cafe",4.4,31,.009,-.029,true], ["Morning Ritual","coffee_shop",4.2,8,.03,.018,null],
  ["Butter & Batter","bakery",3.9,12,-.032,-.02,false], ["New Leaf Cafe","cafe",null,null,.033,-.025,null],
];
const competitors: Competitor[] = fixtures.map(([name,primaryType,rating,userRatingCount,dy,dx,openNow],i)=>({
  placeId:`sample-${i+1}`,name,primaryType,rating,userRatingCount,
  formattedAddress:`${14+i*7}, ${["Market Road","College Road","Gandhi Road","Town Centre"][i%4]}, Proddatur · fictional address`,
  latitude:center.latitude+dy,longitude:center.longitude+dx,openNow,
  distance:distanceKm(center,{latitude:center.latitude+dy,longitude:center.longitude+dx}),
  similarity:primaryType === "bakery" ? "adjacent" : "direct",attributions:[],
}));
export const sampleMarket: Market = {source:"sample", business:"Cafe", location:"Proddatur, Andhra Pradesh",center,competitors,fetchedAt:"",capped:false,warnings:[]};
