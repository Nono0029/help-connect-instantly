import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Clock, Heart, Filter, Bell, User, Plus, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import PostDemandeForm from "@/components/PostDemandeForm";
import SearchFilters from "@/components/SearchFilters";

interface Demande {
  id: number;
  titre: string;
  description: string;
  categorie: string;
  distance: string;
  distanceKm: number;
  temps: string;
  auteur: string;
  avatar: string;
  urgent: boolean;
  gratuit: boolean;
  prix?: string;
  lat: number;
  lng: number;
}

const demandes: Demande[] = [
  { id: 1, titre: "Aide déménagement canapé", description: "Besoin de 2 personnes costauds pour descendre un canapé 3 places du 4ème étage", categorie: "🏠 Maison", distance: "350m", distanceKm: 0.35, temps: "Il y a 5 min", auteur: "Sophie M.", avatar: "SM", urgent: true, gratuit: false, prix: "30€", lat: 48.858, lng: 2.347 },
  { id: 2, titre: "Garder mon chien ce weekend", description: "Golden retriever très calme, juste besoin de promenades et câlins", categorie: "🐶 Animaux", distance: "800m", distanceKm: 0.8, temps: "Il y a 12 min", auteur: "Marc D.", avatar: "MD", urgent: false, gratuit: false, prix: "25€/jour", lat: 48.862, lng: 2.352 },
  { id: 3, titre: "Réparer fuite robinet cuisine", description: "Le robinet de la cuisine goutte depuis hier, j'ai les joints mais pas les outils", categorie: "🔧 Bricolage", distance: "1.2km", distanceKm: 1.2, temps: "Il y a 20 min", auteur: "Fatima R.", avatar: "FR", urgent: true, gratuit: false, prix: "40€", lat: 48.855, lng: 2.340 },
  { id: 4, titre: "Cours de maths niveau terminale", description: "Mon fils a le bac dans 3 semaines, besoin d'un coup de pouce en maths", categorie: "📚 Cours", distance: "2km", distanceKm: 2, temps: "Il y a 35 min", auteur: "Jean-Pierre L.", avatar: "JL", urgent: false, gratuit: false, prix: "20€/h", lat: 48.865, lng: 2.355 },
  { id: 5, titre: "Quelqu'un pour discuter", description: "Journée difficile, j'aimerais juste parler avec quelqu'un autour d'un café", categorie: "💬 Écoute", distance: "500m", distanceKm: 0.5, temps: "Il y a 8 min", auteur: "Lucas T.", avatar: "LT", urgent: false, gratuit: true, lat: 48.860, lng: 2.344 },
  { id: 6, titre: "Monter une étagère IKEA", description: "J'ai l'étagère KALLAX et tous les outils, juste besoin d'aide pour la monter", categorie: "🔧 Bricolage", distance: "1.5km", distanceKm: 1.5, temps: "Il y a 45 min", auteur: "Camille B.", avatar: "CB", urgent: false, gratuit: false, prix: "15€", lat: 48.857, lng: 2.350 },
  { id: 7, titre: "Cherche dev React pour projet perso", description: "Besoin d'un développeur React pour 2-3h ce weekend sur une app perso", categorie: "💻 Tech", distance: "3km", distanceKm: 3, temps: "Il y a 1h", auteur: "Nassim K.", avatar: "NK", urgent: false, gratuit: false, prix: "50€/h", lat: 48.870, lng: 2.360 },
  { id: 8, titre: "Arroser mes plantes cette semaine", description: "Je pars en vacances, j'ai 6 plantes à arroser 2 fois dans la semaine", categorie: "🌱 Jardin", distance: "600m", distanceKm: 0.6, temps: "Il y a 15 min", auteur: "Marie C.", avatar: "MC", urgent: false, gratuit: true, lat: 48.859, lng: 2.346 },
];

const categories = ["Tout", "🏠 Maison", "🔧 Bricolage", "🐶 Animaux", "📚 Cours", "💬 Écoute", "💻 Tech", "🌱 Jardin"];

const Index = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("Tout");
  const [likedIds, setLikedIds] = useState<number[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ type: "Tout", maxDistance: 999, prix: "all" });

  const filtered = demandes
    .filter(d => {
      const matchSearch = d.titre.toLowerCase().includes(search.toLowerCase()) || d.description.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCat === "Tout" || d.categorie === selectedCat;
      const matchType = filters.type === "Tout" || d.categorie === filters.type;
      const matchDist = d.distanceKm <= filters.maxDistance;
      const matchPrix = filters.prix === "all" ||
        (filters.prix === "gratuit" && d.gratuit) ||
        (!d.gratuit && d.prix && parseFloat(d.prix.replace(/[^0-9.]/g, "")) <= parseFloat(filters.prix));
      return matchSearch && matchCat && matchType && matchDist && matchPrix;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const toggleLike = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const activeFiltersCount = [
    filters.type !== "Tout",
    filters.maxDistance !== 999,
    filters.prix !== "all",
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Deman<span className="text-primary">dé</span>
            </h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-accent rounded-full" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
                <User className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une demande..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-10 h-11 rounded-xl bg-secondary border-none text-sm"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 relative"
              onClick={() => setShowFilters(true)}
            >
              <Filter className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <MapPin className="w-3 h-3 text-primary" />
            <span>Paris 11ème</span>
            <ChevronDown className="w-3 h-3" />
            <span className="ml-auto text-primary font-medium">{filtered.length} demandes autour de toi</span>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCat === cat
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Mini Map */}
      <div className="mx-4 mt-3 rounded-2xl overflow-hidden border border-border relative h-40 bg-secondary">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-primary/10" />
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 20} x2="100%" y2={i * 20} stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" />
          ))}
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 35} y1="0" x2={i * 35} y2="100%" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" />
          ))}
        </svg>
        {filtered.slice(0, 6).map((d, i) => {
          const positions = [
            { left: "45%", top: "45%" }, { left: "25%", top: "30%" }, { left: "65%", top: "55%" },
            { left: "35%", top: "65%" }, { left: "70%", top: "25%" }, { left: "55%", top: "70%" },
          ];
          return (
            <motion.div key={d.id} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.08 }} className="absolute" style={positions[i]}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${d.urgent ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>
                {d.avatar[0]}
              </div>
              {d.urgent && <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-ping" />}
            </motion.div>
          );
        })}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-4 h-4 rounded-full bg-primary border-2 border-primary-foreground shadow-lg" />
          <div className="absolute inset-0 w-4 h-4 rounded-full bg-primary/30 animate-ping" />
        </div>
        <div className="absolute bottom-2 right-2">
          <Button size="sm" variant="secondary" className="text-xs h-7 rounded-lg shadow-sm bg-card">
            <MapPin className="w-3 h-3 mr-1" /> Voir la carte
          </Button>
        </div>
      </div>

      {/* Demand cards */}
      <div className="flex-1 px-4 pt-4 pb-24 space-y-3">
        <AnimatePresence>
          {filtered.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/demande/${d.id}`)}
              className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    {d.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.auteur}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{d.distance}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{d.temps}</span>
                    </div>
                  </div>
                </div>
                <button onClick={(e) => toggleLike(d.id, e)} className="p-1">
                  <Heart className={`w-5 h-5 transition-colors ${likedIds.includes(d.id) ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                </button>
              </div>

              <h3 className="font-semibold text-foreground mb-1">{d.titre}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{d.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs rounded-lg">{d.categorie}</Badge>
                  {d.urgent && <Badge className="bg-destructive text-destructive-foreground text-xs rounded-lg">⚡ Urgent</Badge>}
                </div>
                <span className={`text-sm font-bold ${d.gratuit ? "text-accent" : "text-foreground"}`}>
                  {d.gratuit ? "Gratuit ❤️" : d.prix}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* FAB */}
      <motion.div className="fixed bottom-6 right-6 z-50" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button size="lg" className="rounded-full h-14 w-14 shadow-xl shadow-primary/30 bg-primary text-primary-foreground" onClick={() => setShowForm(true)}>
          <Plus className="w-6 h-6" />
        </Button>
      </motion.div>

      <PostDemandeForm open={showForm} onClose={() => setShowForm(false)} />
      <SearchFilters open={showFilters} onClose={() => setShowFilters(false)} filters={filters} onApply={setFilters} />
    </div>
  );
};

export default Index;
