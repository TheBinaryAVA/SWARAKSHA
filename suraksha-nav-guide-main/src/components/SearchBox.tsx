import { useEffect, useRef, useState } from "react";

export type Place = { name: string; lat: number; lon: number };

type Props = {
  value: Place | null;
  onChange: (p: Place | null) => void;
  placeholder: string;
  icon: string;
};

const CHENNAI_VIEWBOX = "79.95,13.25,80.35,12.85"; // left,top,right,bottom

export function SearchBox({ value, onChange, placeholder, icon }: Props) {
  const [q, setQ] = useState(value?.name ?? "");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQ(value?.name ?? "");
  }, [value]);

  useEffect(() => {
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }
    if (value && q === value.name) return;
    setLoading(true);
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(async () => {
      try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", q);
        url.searchParams.set("format", "json");
        url.searchParams.set("limit", "5");
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("countrycodes", "in");
        url.searchParams.set("viewbox", CHENNAI_VIEWBOX);
        url.searchParams.set("bounded", "0");
        const r = await fetch(url.toString(), {
          headers: { "Accept-Language": "en" },
        });
        const data = (await r.json()) as Array<{
          display_name: string;
          lat: string;
          lon: string;
        }>;
        const sorted = data
          .map((d) => ({
            name: d.display_name,
            lat: parseFloat(d.lat),
            lon: parseFloat(d.lon),
          }))
          .sort((a, b) => {
            const ac = a.name.toLowerCase().includes("chennai") ? -1 : 0;
            const bc = b.name.toLowerCase().includes("chennai") ? -1 : 0;
            return ac - bc;
          });
        setResults(sorted);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (tRef.current) clearTimeout(tRef.current);
    };
  }, [q, value]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 input-neon">
        <span className="text-base leading-none">{icon}</span>
        <input
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          placeholder={placeholder}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (value) onChange(null);
          }}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
        />
        {loading && <span className="text-xs text-muted-foreground">…</span>}
        {value && (
          <button
            onClick={() => {
              onChange(null);
              setQ("");
            }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="clear"
          >
            ×
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="glass absolute z-[1000] mt-1.5 max-h-64 w-full overflow-auto rounded-xl py-1 text-sm">
          {results.map((r, i) => (
            <li key={i}>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(r);
                  setQ(r.name);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-accent/40"
              >
                <div className="line-clamp-2">{r.name}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
