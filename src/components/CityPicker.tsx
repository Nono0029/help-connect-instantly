import { useState, useRef, useEffect } from "react";
import { MapPin, Search, X, ChevronDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/context/LanguageContext";

interface CityResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface Props {
  ville: string;
  onChange: (ville: string, lat: number, lng: number) => void;
}

const CityPicker = ({ ville, onChange }: Props) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&featuretype=city,town,village&accept-language=fr`
        );
        const data = await res.json();
        setResults(data);
      } catch { setResults([]); }
      setLoading(false);
    }, 400);
  }, [query]);

  const getShortName = (display_name: string) =>
    display_name.split(",").slice(0, 2).join(",").trim();

  const handleSelect = (result: CityResult) => {
    onChange(getShortName(result.display_name), parseFloat(result.lat), parseFloat(result.lon));
    setOpen(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <MapPin className="w-3 h-3 text-primary" />
        <span className="font-medium text-foreground">{ville}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex flex-col justify-end"
            onClick={() => setOpen(false)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-background rounded-t-3xl flex flex-col overflow-hidden">
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="flex items-center justify-between px-4 pb-3 border-b border-border shrink-0">
                <button onClick={() => setOpen(false)} className="text-muted-foreground p-1"><X className="w-5 h-5" /></button>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> {t('cityPicker.title')}
                </h2>
                <div className="w-7" />
              </div>
              <div className="px-4 pt-3 pb-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input ref={inputRef} type="text" placeholder="Rechercher une ville..."
                    value={query} onChange={e => setQuery(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-secondary border-none text-sm outline-none text-foreground placeholder:text-muted-foreground" />
                  {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="w-4 h-4" /></button>}
                </div>
              </div>
              <div className="overflow-y-auto px-4 pb-8 h-64">
                {loading && <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>}
                {!loading && query.length < 2 && <p className="text-center text-sm text-muted-foreground py-8">Tapez au moins 2 lettres pour lancer la recherche</p>}
                {!loading && query.length >= 2 && results.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">{t('cityPicker.noResults', { query })}</p>}
                <div className="space-y-1">
                  {results.map((r, i) => (
                    <button key={i} onClick={() => handleSelect(r)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-left hover:bg-secondary transition-colors">
                      <MapPin className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">{getShortName(r.display_name)}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.display_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CityPicker;
