import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { SearchBox, type Place } from "@/components/SearchBox";
import { LANGS, t, aiTemplates, type Lang } from "@/lib/i18n";
import {
  generateRoutes, inferWeather, MODES, nearbyServices,
  type LatLng, type Mode, type RouteData,
} from "@/lib/safety";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "SURAKSHA — AI-Powered Safe Navigation" },
      { name: "description", content: "Neon-themed AI safe navigation for Chennai & Tamil Nadu by Avanthika P." },
    ],
  }),
});

const MapView = lazy(() => import("@/components/MapView"));

function Index() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [lang, setLang] = useState<Lang>("en");
  const [start, setStart] = useState<Place | null>(null);
  const [end, setEnd] = useState<Place | null>(null);
  const [time, setTime] = useState<string>(() => {
    const d = new Date(); d.setSeconds(0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [mode, setMode] = useState<Mode>("car");
  const [navigating, setNavigating] = useState(false);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [selectedKind, setSelectedKind] = useState<RouteData["kind"] | null>(null);
  const [tab, setTab] = useState<"routes" | "ai" | "nearby">("routes");
  const [sosOpen, setSosOpen] = useState(false);
  const [sosState, setSosState] = useState<"idle" | "sending" | "sent">("idle");
  const [selectedService, setSelectedService] = useState<{ id: string; kind: "police" | "hospital"; name: string; lat: number; lon: number; status: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const weather = useMemo(() => inferWeather(time), [time]);

  const startLL: LatLng | null = start ? { lat: start.lat, lon: start.lon } : null;
  const endLL: LatLng | null = end ? { lat: end.lat, lon: end.lon } : null;

  const services = useMemo(
    () => (navigating && startLL ? nearbyServices(startLL) : []),
    [navigating, startLL?.lat, startLL?.lon],
  );

  const handleStart = () => {
    if (!startLL || !endLL) return;
    const r = generateRoutes(startLL, endLL, mode, weather);
    setRoutes(r);
    setSelectedKind("safest");
    setNavigating(true);
    setTab("routes");
  };
  const handleStop = () => {
    setNavigating(false);
    setRoutes([]);
    setSelectedKind(null);
    setSelectedService(null);
  };

  // Re-generate when mode changes during navigation
  useEffect(() => {
    if (navigating && startLL && endLL) {
      setRoutes(generateRoutes(startLL, endLL, mode, weather));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, weather]);

  const modeIcon = MODES.find((m) => m.id === mode)!.icon;
  const selected = routes.find((r) => r.kind === selectedKind) ?? null;

  const triggerSOS = () => {
    setSosOpen(true);
    setSosState("sending");
    setTimeout(() => setSosState("sent"), 1600);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Map */}
      <div className="absolute inset-0">
        {mounted ? (
          <Suspense fallback={<div className="h-full w-full bg-muted" />}>
            <MapView
              start={startLL}
              end={endLL}
              routes={routes}
              selectedKind={selectedKind}
              onSelectRoute={setSelectedKind}
              navigating={navigating}
              modeIcon={modeIcon}
              services={services}
              onServiceClick={setSelectedService}
              selectedService={selectedService}
              theme={theme}
            />
          </Suspense>
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
      </div>

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1100] flex items-start justify-between gap-3 p-3 sm:p-4">
        <div className="glass pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-2.5">
          <div className="relative grid h-9 w-9 place-items-center rounded-xl"
               style={{ background: "radial-gradient(circle, oklch(0.85 0.18 195 / 0.4), transparent 70%)" }}>
            <span className="text-xl">🛡️</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-base font-bold tracking-[0.2em] neon-text">SURAKSHA</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t(lang, "app_sub")} · {t(lang, "by")}
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <div className="glass flex items-center gap-1 rounded-2xl p-1">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`rounded-xl px-2.5 py-1.5 text-xs transition ${
                  lang === l.code ? "bg-[color-mix(in_oklab,var(--neon-cyan)_20%,transparent)] text-[var(--neon-cyan)]" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="mr-1">{l.flag}</span>
                {l.code.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => setTheme((p) => (p === "dark" ? "light" : "dark"))}
            className="glass rounded-2xl px-3 py-2 text-sm"
            aria-label="theme"
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </button>
          <button onClick={triggerSOS} className="btn-danger">
            🚨 {t(lang, "sos")}
          </button>
        </div>
      </header>

      {/* Left planning panel */}
      <aside className="absolute left-3 top-20 z-[1100] w-[min(360px,calc(100vw-1.5rem))] sm:left-4 sm:top-24">
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t(lang, "current")}
            </label>
            <SearchBox value={start} onChange={setStart} placeholder={t(lang, "search_ph")} icon="📍" />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t(lang, "destination")}
            </label>
            <SearchBox value={end} onChange={setEnd} placeholder={t(lang, "search_ph")} icon="🏁" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">{t(lang, "time")}</label>
              <input
                type="datetime-local"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="input-neon"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">{t(lang, "weather")}</label>
              <div className="input-neon flex items-center gap-2">
                <span>{weather === "clear" ? "☀️" : weather === "rain" ? "🌧️" : "🌙"}</span>
                <span className="text-sm">{t(lang, `weather_${weather}`)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">{t(lang, "mode")}</label>
            <div className="grid grid-cols-5 gap-1.5">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  title={m.label}
                  className={`rounded-xl py-2 text-lg transition ${
                    mode === m.id
                      ? "neon-border bg-[color-mix(in_oklab,var(--neon-cyan)_15%,transparent)]"
                      : "border border-transparent bg-secondary/40 hover:bg-secondary"
                  }`}
                >
                  {m.icon}
                </button>
              ))}
            </div>
          </div>

          {!navigating ? (
            <button
              onClick={handleStart}
              disabled={!startLL || !endLL}
              className="btn-neon w-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              ▶ {t(lang, "start_nav")}
            </button>
          ) : (
            <button onClick={handleStop} className="btn-danger w-full">■ {t(lang, "stop_nav")}</button>
          )}

          {!startLL || !endLL ? (
            <p className="text-xs text-muted-foreground">{t(lang, "pick_to_start")}</p>
          ) : null}
        </div>
      </aside>

      {/* Right info panel */}
      <aside className="absolute right-3 top-20 z-[1100] w-[min(360px,calc(100vw-1.5rem))] sm:right-4 sm:top-24">
        <div className="glass overflow-hidden rounded-2xl">
          <div className="grid grid-cols-3 border-b border-border/50 text-xs">
            {([
              ["routes", t(lang, "route_info")],
              ["ai", t(lang, "ai_insights")],
              ["nearby", t(lang, "nearby")],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-3 py-2.5 transition ${
                  tab === id
                    ? "bg-[color-mix(in_oklab,var(--neon-cyan)_15%,transparent)] text-[var(--neon-cyan)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="max-h-[55vh] overflow-auto p-3 space-y-3">
            {!navigating && (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                {t(lang, "no_routes")}
              </p>
            )}

            {navigating && tab === "routes" && (
              <div className="space-y-2">
                {routes.map((r) => (
                  <button
                    key={r.kind}
                    onClick={() => setSelectedKind(r.kind)}
                    className={`block w-full rounded-xl border p-3 text-left transition ${
                      selectedKind === r.kind
                        ? "border-[color-mix(in_oklab,var(--neon-cyan)_60%,transparent)] bg-[color-mix(in_oklab,var(--neon-cyan)_10%,transparent)]"
                        : "border-border/50 bg-secondary/30 hover:bg-secondary/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: r.color, boxShadow: `0 0 10px ${r.color}` }} />
                        <span className="font-semibold">{t(lang, r.kind)}</span>
                      </div>
                      <span className="chip">{r.safety}/10</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>⏱ {r.durationMin} {t(lang, "min")}</span>
                      <span>📏 {r.distanceKm.toFixed(1)} {t(lang, "km")}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {navigating && tab === "ai" && selected && (
              <AIInsights lang={lang} selected={selected} routes={routes} time={time} />
            )}

            {navigating && tab === "nearby" && (
              <ul className="space-y-2">
                {services.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelectedService(s)}
                      className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-secondary/30 p-3 text-left text-sm hover:bg-secondary/60"
                    >
                      <span className="flex items-center gap-2">
                        <span>{s.kind === "police" ? "🚓" : "🏥"}</span>
                        <span>{s.name}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{s.status}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>

      {/* SOS panel */}
      {sosOpen && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/70 p-6 backdrop-blur">
          <div className="glass w-full max-w-md rounded-3xl p-6 text-center"
               style={{ borderColor: "oklch(0.7 0.25 20 / 0.8)", boxShadow: "0 0 40px oklch(0.65 0.28 20 / 0.6)" }}>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/30 text-3xl"
                 style={{ boxShadow: "0 0 30px oklch(0.65 0.28 20 / 0.8)" }}>
              🚨
            </div>
            <h2 className="mt-4 font-display text-2xl tracking-widest text-[oklch(0.95_0.05_20)]">
              {t(lang, "sos_title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{t(lang, "sos_msg")}</p>
            <p className="mt-3 text-sm">
              {sosState === "sending" ? `⏳ ${t(lang, "sending")}` : sosState === "sent" ? `✅ ${t(lang, "sent")}` : ""}
            </p>
            <div className="mt-5 grid gap-2">
              <a href="tel:100" className="btn-danger">📞 {t(lang, "call_police")}</a>
              <a href="tel:+910000000000" className="btn-neon">👤 {t(lang, "call_contact")}</a>
              <button
                onClick={() => { setSosOpen(false); setSosState("idle"); }}
                className="rounded-xl px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"
              >
                {t(lang, "cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AIInsights({
  lang, selected, routes, time,
}: { lang: Lang; selected: RouteData; routes: RouteData[]; time: string }) {
  const why = aiTemplates.why[selected.kind][lang];
  const others = routes.filter((r) => r.kind !== selected.kind);
  const safest = [...routes].sort((a, b) => b.safety - a.safety)[0];
  const final =
    selected.kind === safest.kind
      ? aiTemplates.finalSafe[lang].replaceAll("{time}", new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
      : aiTemplates.finalRisk[lang];

  const Bar = ({ label, value }: { label: string; value: number }) => (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{value.toFixed(1)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value * 10}%`,
            background: `linear-gradient(90deg, ${selected.color}, ${selected.color}aa)`,
            boxShadow: `0 0 10px ${selected.color}`,
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t(lang, "safety")}</div>
        <div className="mt-1 flex items-end gap-2">
          <span className="font-display text-4xl" style={{ color: selected.color, textShadow: `0 0 14px ${selected.color}` }}>
            {selected.safety}
          </span>
          <span className="pb-1 text-sm text-muted-foreground">/ 10</span>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t(lang, "why")}</div>
        <p className="mt-1 text-sm leading-relaxed">{why}</p>
      </div>

      <div className="rounded-xl border border-border/50 bg-secondary/30 p-3 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t(lang, "breakdown")}</div>
        <Bar label={t(lang, "crime")} value={selected.breakdown.crime} />
        <Bar label={t(lang, "isolation")} value={selected.breakdown.isolation} />
        <Bar label={t(lang, "police")} value={selected.breakdown.police} />
        <Bar label={t(lang, "weather")} value={selected.breakdown.weather} />
        <Bar label={t(lang, "time")} value={selected.breakdown.time} />
      </div>

      <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t(lang, "comparison")}</div>
        <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
          {others.map((o) => (
            <li key={o.kind} className="flex items-start gap-2">
              <span className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full" style={{ background: o.color, boxShadow: `0 0 8px ${o.color}` }} />
              <span>
                <span className="text-foreground">{t(lang, o.kind)}</span>: {(selected.safety - o.safety).toFixed(1)} pts {selected.safety > o.safety ? "lower safety" : "higher safety"}, {Math.abs(selected.durationMin - o.durationMin)} {t(lang, "min")} {o.durationMin < selected.durationMin ? "faster" : "slower"}.
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border p-3 text-sm"
           style={{ borderColor: `${selected.color}80`, background: `${selected.color}15` }}>
        <div className="text-[10px] uppercase tracking-wider" style={{ color: selected.color }}>{t(lang, "final")}</div>
        <p className="mt-1">{final}</p>
      </div>
    </div>
  );
}
