"use server";
// src/features/market/actions.ts — "Visible businesses nearby" (#14) from OpenStreetMap.
// Geocode the area once (Nominatim), then ask Overpass for similar shops within ~1.5 km. Cached per plan.
import { requirePlan, requireUser } from "@/lib/auth";
import { getSection, saveSection } from "@/features/validate/server/sections";
import { marketKind, OSM_FILTER } from "./lib/category";

export type Place = { name: string; lat: number; lon: number; kind: string };
export type Nearby = { center: { lat: number; lon: number }; places: Place[]; area: string; fetchedAt: string; kind?: string };

const UA = { "User-Agent": "StartWise/1.0 (She Solves 3.0 hackathon; contact via app)", "Accept-Language": "en" };

async function geocode(q: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return null;
  const [hit] = (await res.json()) as { lat: string; lon: string }[];
  return hit ? { lat: Number(hit.lat), lon: Number(hit.lon) } : null;
}

async function overpass(lat: number, lon: number, filter: string): Promise<Place[]> {
  const query = `[out:json][timeout:20];(node${filter}(around:1500,${lat},${lon});way${filter}(around:1500,${lat},${lon}););out center 40;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { ...UA, "content-type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { elements: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] };
  return data.elements
    .map((e) => ({ name: e.tags?.name ?? "", lat: e.lat ?? e.center?.lat ?? 0, lon: e.lon ?? e.center?.lon ?? 0, kind: e.tags?.shop ?? e.tags?.amenity ?? "shop" }))
    .filter((p) => p.lat && p.lon)
    .slice(0, 40);
}

export async function getNearby(planId: string, refresh = false): Promise<{ ok: true; nearby: Nearby } | { ok: false; error: "noArea" | "failed" | "noKind" }> {
  const user = await requireUser();
  const plan = await requirePlan(planId);
  const p = plan.profile;
  if (!p?.city) return { ok: false, error: "noArea" };
  const area = [p.locality, p.city].filter(Boolean).join(", ");
  const kind = marketKind(p);
  if (!kind) return { ok: false, error: "noKind" };
  const cached = await getSection<Nearby>(planId, "market", "en");
  if (cached && !refresh && cached.content.area === area && cached.content.kind === kind) return { ok: true, nearby: cached.content };
  try {
    const center = (await geocode(area)) ?? (await geocode(p.city));
    if (!center) return { ok: false, error: "noArea" };
    const places = await overpass(center.lat, center.lon, OSM_FILTER[kind]);
    const nearby: Nearby = { center, places, area, fetchedAt: new Date().toISOString(), kind };
    await saveSection(planId, "market", "en", nearby, false, user.id);
    return { ok: true, nearby };
  } catch {
    return { ok: false, error: "failed" };
  }
}
