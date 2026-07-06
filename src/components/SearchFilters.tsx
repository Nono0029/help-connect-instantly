import { useState } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/context/LanguageContext";

interface Filters {
  type: string;
  maxDistance: number;
  prix: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onApply: (filters: Filters) => void;
}

const SearchFilters = ({ open, onClose, filters, onApply }: Props) => {
  const { t } = useTranslation();
  const [type, setType] = useState(filters.type);
  const [maxDistance, setMaxDistance] = useState(filters.maxDistance);
  const [prix, setPrix] = useState(filters.prix);

  const typesFiltre = [
    t('searchFilters.all'), "🏠 Maison", "🔧 Bricolage", "🐶 Animaux", "📚 Cours", "💬 Écoute", "💻 Tech", "🌱 Jardin", "🚗 Transport"
  ];

  const distancesFiltre = [
    { label: "< 500m", value: 0.5 },
    { label: "< 1km", value: 1 },
    { label: "< 2km", value: 2 },
    { label: "< 5km", value: 5 },
    { label: "< 10km", value: 10 },
    { label: t('searchFilters.everywhere'), value: 999 },
  ];

  const prixFiltre = [
    { label: t('searchFilters.free'), value: "gratuit" },
    { label: "< 20€", value: "20" },
    { label: "< 50€", value: "50" },
    { label: "< 100€", value: "100" },
    { label: t('searchFilters.allPrices'), value: "all" },
  ];

  const handleApply = () => {
    onApply({ type, maxDistance, prix });
    onClose();
  };

  const handleReset = () => {
    setType("Tout");
    setMaxDistance(999);
    setPrix("all");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
              <button onClick={onClose} className="p-1 text-muted-foreground"><X className="w-5 h-5" /></button>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" /> {t('searchFilters.title')}
              </h2>
              <button onClick={handleReset} className="text-xs text-primary font-medium">{t('searchFilters.reset')}</button>
            </div>

            <div className="px-4 py-5 space-y-6">
              {/* Type */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">{t('searchFilters.typeLabel')}</label>
                <div className="flex flex-wrap gap-2">
                  {typesFiltre.map(typeItem => (
                    <button
                      key={typeItem}
                      onClick={() => setType(typeItem)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        type === typeItem
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-muted-foreground border-transparent"
                      }`}
                    >
                      {typeItem}
                    </button>
                  ))}
                </div>
              </div>

              {/* Distance */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">{t('searchFilters.distanceLabel')}</label>
                <div className="flex flex-wrap gap-2">
                  {distancesFiltre.map(d => (
                    <button
                      key={d.value}
                      onClick={() => setMaxDistance(d.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        maxDistance === d.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-muted-foreground border-transparent"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prix */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">{t('searchFilters.budgetLabel')}</label>
                <div className="flex flex-wrap gap-2">
                  {prixFiltre.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setPrix(p.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        prix === p.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-muted-foreground border-transparent"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={handleApply} className="w-full h-12 rounded-xl text-base font-semibold">
                {t('searchFilters.apply')}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchFilters;
