import { useState, useRef, useEffect } from "react";
import { MapPin, Search, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Liste de villes françaises populaires
const VILLES_SUGGESTIONS = [
  "Paris 1er", "Paris 2ème", "Paris 3ème", "Paris 4ème", "Paris 5ème",
  "Paris 6ème", "Paris 7ème", "Paris 8ème", "Paris 9ème", "Paris 10ème",
  "Paris 11ème", "Paris 12ème", "Paris 13ème", "Paris 14ème", "Paris 15ème",
  "Paris 16ème", "Paris 17ème", "Paris 18ème", "Paris 19ème", "Paris 20ème",
  "Lyon 1er", "Lyon 2ème", "Lyon 3ème", "Lyon 4ème", "Lyon 5ème",
  "Lyon 6ème", "Lyon 7ème", "Lyon 8ème", "Lyon 9ème",
  "Marseille 1er", "Marseille 2ème", "Marseille 3ème", "Marseille 4ème",
  "Marseille 5ème", "Marseille 6ème", "Marseille 7ème", "Marseille 8ème",
  "Bordeaux", "Toulouse", "Nantes", "Strasbourg", "Lille", "Rennes",
  "Reims", "Nice", "Toulon", "Grenoble", "Montpellier", "Béziers",
  "Clermont-Ferrand", "Rouen", "Caen", "Nancy", "Metz", "Amiens",
  "Tours", "Orléans", "Dijon", "Angers", "Le Mans", "Saint-Étienne",
  "Brest", "Nîmes", "Le Havre", "Mulhouse", "Perpignan", "Besançon",
];

interface Props {
  ville: string;
  onChange: (ville: string) => void;
}

const CityPicker = ({ ville, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = query.length >= 1
    ? VILLES_SUGGESTIONS.filter(v =>
        v.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : VILLES_SUGGESTIONS.slice(0, 8);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
    }
  }, [open]);

  const handleSelect = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <>
      {/* Trigger inline */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <MapPin className="w-3 h-3 text-primary" />
        <span className="font-medium text-foreground">{ville}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {/* Bottom sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl max-h-[60vh] flex flex-col"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
                <button onClick={() => setOpen(false)} className="text-muted-foreground p-1">
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> Choisir ma ville
                </h2>
                <div className="w-7" />
              </div>

              {/* Search */}
              <div className="px-4 pt-3 pb-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Rechercher une ville..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-secondary border-none text-sm outline-none text-foreground placeholder:text-muted-foreground"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              <className="overflow-y-auto px-4 pb-6 max-h-[300px]">
                {suggestions.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Aucune ville trouvée pour « {query} »
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">
                      {query ? "Résultats" : "Villes populaires"}
                    </p>
                    <div className="space-y-1">
                      {suggestions.map(v => (
                        <button
                          key={v}
                          onClick={() => handleSelect(v)}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-left transition-colors ${
                            v === ville
                              ? "bg-primary/10 text-primary font-semibold"
                              : "hover:bg-secondary text-foreground"
                          }`}
                        >
                          <MapPin className={`w-4 h-4 shrink-0 ${v === ville ? "text-primary" : "text-muted-foreground"}`} />
                          {v}
                          {v === ville && (
                            <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                              Actuelle
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CityPicker;
