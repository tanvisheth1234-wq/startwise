"use client";
// Leaflet map of visible businesses nearby. Loaded only in the browser (Leaflet needs `window`).
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { Nearby } from "../actions";

export default function NearbyMap({ nearby, youLabel }: { nearby: Nearby; youLabel: string }) {
  const { center, places } = nearby;
  return (
    <MapContainer center={[center.lat, center.lon]} zoom={14} scrollWheelZoom={false} className="h-72 w-full rounded-3xl" attributionControl>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <CircleMarker center={[center.lat, center.lon]} radius={12} pathOptions={{ color: "#c2477a", fillColor: "#ec6a3c", fillOpacity: 0.9, weight: 3 }}>
        <Popup>{youLabel}</Popup>
      </CircleMarker>
      {places.map((p, i) => (
        <CircleMarker key={i} center={[p.lat, p.lon]} radius={7} pathOptions={{ color: "#4a2c22", fillColor: "#ffc24b", fillOpacity: 0.95, weight: 2 }}>
          <Popup>{p.name || p.kind}</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
