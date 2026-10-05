// Her answers are saved in her own words ("families in my society"), but the business card talks
// to her ("Who will buy: families in your society"). Swap first-person words for "your".
import type { Lang } from "@/contracts/profile";

const SWAPS: Record<Lang, [RegExp, string][]> = {
  en: [
    [/\bmy\b/gi, "your"],
    [/\bmine\b/gi, "yours"],
    [/\bme\b/gi, "you"],
    [/\bour\b/gi, "your"],
  ],
  hi: [
    [/मेरे/g, "आपके"],
    [/मेरी/g, "आपकी"],
    [/मेरा/g, "आपका"],
    [/हमारे/g, "आपके"],
    [/हमारी/g, "आपकी"],
    [/हमारा/g, "आपका"],
  ],
  mr: [
    [/माझ्या/g, "तुमच्या"],
    [/माझी/g, "तुमची"],
    [/माझा/g, "तुमचा"],
    [/माझे/g, "तुमचे"],
    [/आमच्या/g, "तुमच्या"],
  ],
};

export function asYours(text: string, lang: Lang): string {
  return SWAPS[lang].reduce((s, [from, to]) => s.replace(from, (m) => (m[0] === m[0].toUpperCase() && /[A-Z]/.test(m[0]) ? to[0].toUpperCase() + to.slice(1) : to)), text);
}
