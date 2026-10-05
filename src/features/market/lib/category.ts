// src/features/market/lib/category.ts — pure: what kind of business is this, for the nearby map and
// the price table? Decided by keywords in what she sells (English, Hindi, Marathi), not by the AI.
import type { BusinessProfile } from "@/contracts/profile";

export type MarketKind = "bakery" | "sweets" | "meals" | "cafe" | "tailoring" | "clothes" | "beauty" | "tuition" | "gifts" | "grocery";

const RULES: { kind: MarketKind; words: RegExp }[] = [
  { kind: "bakery", words: /cake|cookie|brownie|bak|cupcake|bread|केक|कुकी|बेकरी|ब्राउनी/i },
  { kind: "sweets", words: /sweet|mithai|modak|ladoo|laddu|barfi|पेढ|मोदक|लाडू|लड्डू|मिठाई|बर्फी|चिक्की/i },
  { kind: "meals", words: /tiffin|dabba|meal|mess|thali|lunch|dinner|restaurant|cloud kitchen|biryani|टिफ़िन|टिफिन|डबा|डब्बा|जेवण|खाना|थाली|मेस|रेस्टॉरंट|रेस्टोरेंट/i },
  { kind: "cafe", words: /caf[eé]|coffee|chai|tea|juice|snack|sandwich|vada pav|कॅफे|कैफ़े|चाय|चहा|नाश्ता|वडा/i },
  { kind: "tailoring", words: /tailor|stitch|blouse|alteration|सिलाई|शिलाई|ब्लाउज|शिवण|टेलर/i },
  { kind: "clothes", words: /saree|sari|kurti|dress|cloth|boutique|fashion|साड़ी|साडी|कुर्ती|कपड|बुटीक/i },
  { kind: "beauty", words: /beauty|parlou?r|salon|mehendi|mehndi|makeup|nail|ब्यूटी|पार्लर|मेहंदी|सलून/i },
  { kind: "tuition", words: /tuition|coaching|class|teach|maths?|english|स्कूल|ट्यूशन|क्लास|शिकवणी|कोचिंग/i },
  { kind: "gifts", words: /candle|gift|craft|jewel|handmade|decor|मोमबत्ती|मेणबत्ती|गिफ्ट|हस्तकला|ज्वेल/i },
  { kind: "grocery", words: /pickle|papad|masala|spice|achar|अचार|लोणचं|पापड़|पापड|मसाला/i },
];

export function marketKind(p: Pick<BusinessProfile, "product" | "businessType">): MarketKind | null {
  for (const r of RULES) if (r.words.test(p.product)) return r.kind;
  if (p.businessType === "tailoring_boutique") return "tailoring";
  if (p.businessType === "online_reselling") return "clothes";
  return null;
}

/** OpenStreetMap filters for similar visible businesses. */
export const OSM_FILTER: Record<MarketKind, string> = {
  bakery: '["shop"~"bakery|confectionery|pastry"]',
  sweets: '["shop"~"confectionery|pastry|sweets"]',
  meals: '["amenity"~"restaurant|fast_food|food_court"]',
  cafe: '["amenity"~"cafe|fast_food"]',
  tailoring: '["shop"~"tailor|sewing|fabric"]',
  clothes: '["shop"~"clothes|boutique|fashion"]',
  beauty: '["shop"~"beauty|hairdresser|cosmetics"]',
  tuition: '["amenity"~"school|college|prep_school|training|language_school"]',
  gifts: '["shop"~"gift|craft|jewelry|interior_decoration"]',
  grocery: '["shop"~"convenience|supermarket|deli|spices"]',
};
