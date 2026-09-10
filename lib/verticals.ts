import type { Similarity } from "./model";
export interface Vertical {
  id: string; label: string; aliases: string[]; googleTypes: string[];
  directTypes: string[]; competitorLabel: string; subtypeLabel: string;
  subtypes: Record<string, string>;
}
// Add new verticals here. Only use current Google Places Table A query types.
export const verticals: Vertical[] = [
  { id: "cafe", label: "Cafe", aliases: ["cafe", "café", "coffee", "coffee shop", "cafes"], googleTypes: ["cafe", "coffee_shop", "bakery"], directTypes: ["cafe", "coffee_shop"], competitorLabel: "cafe competitors", subtypeLabel: "Cafe subtype", subtypes: { cafe: "Cafe", coffee_shop: "Coffee shop", bakery: "Bakery · adjacent" } },
  { id: "clinic", label: "Clinic", aliases: ["clinic", "medical clinic", "clinics"], googleTypes: ["doctor", "medical_clinic", "dental_clinic"], directTypes: ["doctor", "medical_clinic"], competitorLabel: "clinic competitors", subtypeLabel: "Clinic subtype", subtypes: { doctor: "Doctor", medical_clinic: "Medical clinic", dental_clinic: "Dental clinic · adjacent" } },
  { id: "salon", label: "Salon", aliases: ["salon", "hair salon", "beauty salon", "salons"], googleTypes: ["beauty_salon", "hair_salon", "spa"], directTypes: ["beauty_salon", "hair_salon"], competitorLabel: "salon competitors", subtypeLabel: "Salon subtype", subtypes: { beauty_salon: "Beauty salon", hair_salon: "Hair salon", spa: "Spa · adjacent" } },
];
export function getVertical(input: string): Vertical | undefined { return verticals.find(v => v.aliases.includes(input.trim().toLowerCase())); }
export function categorySimilarity(types: string[], vertical?: Vertical): Similarity {
  if (!vertical) return "unverified";
  return types.some(t => vertical.directTypes.includes(t)) ? "direct" : "adjacent";
}
