import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLng, RouteData } from "@/lib/safety";

type Service = { id: string; kind: "police" | "hospital"; name: string; lat: number; lon: number; status: string };

type Props = {
  start: LatLng | null;
  end: LatLng | null;
  routes: RouteData[];
  selectedKind: RouteData["kind"] | null;
  onSelectRoute: (k: RouteData["kind"]) => void;
  navigating: boolean;
  modeIcon: string;
  services: Service[];
  onServiceClick: (s: Service | null) => void;
  selectedService: Service | null;
  theme: "dark" | "light";
};

const makeIcon = (emoji: string, color = "#39e7ff", size = 38) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
      font-size:${size * 0.55}px;border-radius:50%;
      background:radial-gradient(circle, ${color}33, transparent 70%);
      filter: drop-shadow(0 0 8px ${color}) drop-shadow(0 0 16px ${color}88);
    ">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const b = L.latLngBounds(points.map((p) => [p.lat, p.lon]));
    map.fitBounds(b, { padding: [80, 80], maxZoom: 15 });
  }, [points, map]);
  return null;
}

function MovingMarker({ path, modeIcon, color }: { path: LatLng[]; modeIcon: string; color: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    setIdx(0);
    const id = setInterval(() => {
      setIdx((p) => (p + 1) % path.length);
    }, 120);
    return () => clearInterval(id);
  }, [path]);
  if (!path.length) return null;
  const p = path[idx];
  return <Marker position={[p.lat, p.lon]} icon={makeIcon(modeIcon, color, 42)} />;
}

export default function MapView(props: Props) {
  const {
    start, end, routes, selectedKind, onSelectRoute, navigating, modeIcon,
    services, onServiceClick, selectedService, theme,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const fitPoints = useMemo(() => {
    const pts: LatLng[] = [];
    if (start) pts.push(start);
    if (end) pts.push(end);
    if (navigating) routes.forEach((r) => pts.push(...r.path));
    return pts;
  }, [start, end, routes, navigating]);

  const tileUrl =
    theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  const center: [number, number] = start
    ? [start.lat, start.lon]
    : [13.0827, 80.2707]; // Chennai

  const selected = routes.find((r) => r.kind === selectedKind) ?? routes[0];

  return (
    <div ref={containerRef} className="absolute inset-0">
      <MapContainer
        center={center}
        zoom={12}
        zoomControl
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={tileUrl}
        />
        <FitBounds points={fitPoints} />

        {/* Risk zones */}
        {navigating && start && (
          <>
            <Circle
              center={[start.lat + 0.012, start.lon - 0.008]}
              radius={350}
              pathOptions={{ color: "#ff3b5c", weight: 0, fillColor: "#ff3b5c", fillOpacity: 0.18 }}
            />
            <Circle
              center={[start.lat - 0.009, start.lon + 0.014]}
              radius={300}
              pathOptions={{ color: "#39ff88", weight: 0, fillColor: "#39ff88", fillOpacity: 0.12 }}
            />
          </>
        )}

        {/* Markers */}
        {start && <Marker position={[start.lat, start.lon]} icon={makeIcon("📍", "#39e7ff", 40)} />}
        {end && <Marker position={[end.lat, end.lon]} icon={makeIcon("🏁", "#ff7ad9", 40)} />}

        {/* Routes — only after navigating */}
        {navigating &&
          routes.map((r) => {
            const isSel = r.kind === selectedKind;
            const positions = r.path.map((p) => [p.lat, p.lon]) as [number, number][];
            return (
              <Polyline
                key={`glow-${r.kind}`}
                positions={positions}
                pathOptions={{
                  color: r.color,
                  weight: isSel ? 16 : 8,
                  opacity: isSel ? 0.25 : 0.1,
                  lineCap: "round",
                }}
                eventHandlers={{ click: () => onSelectRoute(r.kind) }}
              />
            );
          })}
        {navigating &&
          routes.map((r) => {
            const isSel = r.kind === selectedKind;
            const positions = r.path.map((p) => [p.lat, p.lon]) as [number, number][];
            return (
              <Polyline
                key={r.kind}
                positions={positions}
                pathOptions={{
                  color: r.color,
                  weight: isSel ? 7 : 3,
                  opacity: isSel ? 1 : 0.55,
                  lineCap: "round",
                }}
                eventHandlers={{ click: () => onSelectRoute(r.kind) }}
              />
            );
          })}

        {/* Moving vehicle on selected route */}
        {navigating && selected && (
          <MovingMarker path={selected.path} modeIcon={modeIcon} color={selected.color} />
        )}

        {/* Nearby services */}
        {navigating &&
          services.map((s) => (
            <Marker
              key={s.id}
              position={[s.lat, s.lon]}
              icon={makeIcon(s.kind === "police" ? "🚓" : "🏥", s.kind === "police" ? "#3aa0ff" : "#ff5c8a", 30)}
              eventHandlers={{ click: () => onServiceClick(s) }}
            />
          ))}
      </MapContainer>

      {/* Mini info card */}
      {selectedService && (
        <div
          className="glass absolute z-[1000] bottom-6 left-1/2 -translate-x-1/2 w-72 rounded-2xl p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-wider text-[var(--neon-cyan)]">
                {selectedService.kind === "police" ? "Police Station" : "Hospital"}
              </div>
              <div className="font-semibold">{selectedService.name}</div>
            </div>
            <button onClick={() => onServiceClick(null)} className="text-muted-foreground hover:text-foreground">×</button>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {selectedService.status} • ~{(Math.random() * 1.4 + 0.3).toFixed(1)} km away
          </div>
        </div>
      )}
    </div>
  );
}
