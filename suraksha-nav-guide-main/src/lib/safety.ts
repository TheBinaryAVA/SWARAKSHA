export type LatLng = { lat: number; lon: number };
export type Mode = "walk" | "bike" | "motorbike" | "car" | "bus";

export const MODES: { id: Mode; label: string; icon: string; speedKmh: number }[] = [
  { id: "walk", label: "Walk", icon: "🚶", speedKmh: 5 },
  { id: "bike", label: "Bike", icon: "🚲", speedKmh: 15 },
  { id: "motorbike", label: "Motorbike", icon: "🏍", speedKmh: 35 },
  { id: "car", label: "Car", icon: "🚗", speedKmh: 30 },
  { id: "bus", label: "Bus", icon: "🚌", speedKmh: 22 },
];

export const haversine = (a: LatLng, b: LatLng) => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

// Generate a curved polyline between A and B with offset (for 3 routes)
export const buildRoute = (a: LatLng, b: LatLng, curve: number, steps = 60): LatLng[] => {
  const pts: LatLng[] = [];
  const mx = (a.lat + b.lat) / 2;
  const my = (a.lon + b.lon) / 2;
  const dx = b.lat - a.lat;
  const dy = b.lon - a.lon;
  // perpendicular offset
  const cx = mx + -dy * curve;
  const cy = my + dx * curve;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const lat = u * u * a.lat + 2 * u * t * cx + t * t * b.lat;
    const lon = u * u * a.lon + 2 * u * t * cy + t * t * b.lon;
    pts.push({ lat, lon });
  }
  return pts;
};

export type RouteKind = "safest" | "fastest" | "balanced";
export type Weather = "clear" | "rain" | "night";

export type RouteData = {
  kind: RouteKind;
  color: string;
  glow: string;
  path: LatLng[];
  distanceKm: number;
  durationMin: number;
  safety: number; // 0-10
  breakdown: { crime: number; isolation: number; weather: number; police: number; time: number };
};

const speedFactor = (mode: Mode, kind: RouteKind, weather: Weather) => {
  const base = MODES.find((m) => m.id === mode)!.speedKmh;
  const k = kind === "fastest" ? 1.1 : kind === "balanced" ? 1.0 : 0.85;
  const w = weather === "rain" ? 0.8 : weather === "night" ? 0.9 : 1;
  return base * k * w;
};

const score = (kind: RouteKind, weather: Weather, mode: Mode) => {
  const baseCrime = kind === "safest" ? 9 : kind === "balanced" ? 7 : 5;
  const baseIso = kind === "safest" ? 9 : kind === "balanced" ? 6.5 : 4.5;
  const basePolice = kind === "safest" ? 9 : kind === "balanced" ? 7 : 5.5;
  const baseTime = kind === "safest" ? 7 : kind === "balanced" ? 8 : 6;
  const baseWeather = weather === "clear" ? 9 : weather === "rain" ? 5 : 6;
  const modePenalty = mode === "walk" ? -0.6 : mode === "bike" ? -0.3 : 0;
  return {
    crime: baseCrime + modePenalty,
    isolation: baseIso + modePenalty,
    police: basePolice,
    time: baseTime,
    weather: baseWeather,
  };
};

export const generateRoutes = (
  a: LatLng,
  b: LatLng,
  mode: Mode,
  weather: Weather,
): RouteData[] => {
  const dist = haversine(a, b);
  const configs: { kind: RouteKind; curve: number; color: string; glow: string; mult: number }[] = [
    { kind: "safest", curve: 0.18, color: "#39ff88", glow: "#39ff88", mult: 1.18 },
    { kind: "fastest", curve: -0.06, color: "#3aa0ff", glow: "#3aa0ff", mult: 1.0 },
    { kind: "balanced", curve: 0.08, color: "#ffd23a", glow: "#ffd23a", mult: 1.08 },
  ];
  return configs.map((c) => {
    const path = buildRoute(a, b, c.curve);
    const distanceKm = dist * c.mult;
    const sp = speedFactor(mode, c.kind, weather);
    const durationMin = Math.max(1, Math.round((distanceKm / sp) * 60));
    const br = score(c.kind, weather, mode);
    const safety = Math.max(
      1,
      Math.min(10, (br.crime + br.isolation + br.police + br.time + br.weather) / 5),
    );
    return {
      kind: c.kind,
      color: c.color,
      glow: c.glow,
      path,
      distanceKm,
      durationMin,
      safety: Math.round(safety * 10) / 10,
      breakdown: br,
    };
  });
};

export const inferWeather = (timeISO: string): Weather => {
  const h = new Date(timeISO).getHours();
  if (h >= 20 || h < 6) return "night";
  // pseudo-random based on minutes for variety
  const m = new Date(timeISO).getMinutes();
  return m % 5 === 0 ? "rain" : "clear";
};

// Generate fake nearby services around a point
export const nearbyServices = (center: LatLng) => {
  const rng = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };
  const make = (kind: "police" | "hospital", n: number, names: string[]) =>
    Array.from({ length: n }).map((_, i) => {
      const r = 0.008 + rng(i + (kind === "police" ? 1 : 7)) * 0.018;
      const ang = rng(i * 3 + (kind === "police" ? 2 : 9)) * Math.PI * 2;
      const lat = center.lat + Math.cos(ang) * r;
      const lon = center.lon + Math.sin(ang) * r * 1.1;
      return {
        id: `${kind}-${i}`,
        kind,
        name: names[i % names.length],
        lat,
        lon,
        status: kind === "hospital" ? "Open 24×7" : "On duty",
      };
    });
  return [
    ...make("police", 4, ["Anna Nagar PS", "T Nagar PS", "Mylapore PS", "Velachery PS"]),
    ...make("hospital", 4, ["Apollo Hospital", "MIOT International", "Fortis Malar", "Govt General"]),
  ];
};
