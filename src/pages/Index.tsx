import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Clock, Heart, Filter, Bell, User, Plus, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import PostDemandeForm from "@/components/PostDemandeForm";
import SearchFilters from "@/components/SearchFilters";
import CityPicker from "@/components/CityPicker";
import { supabase } from "@/lib/supabase";

interface Demande {
  id: number;
  titre: string;
  description: string;
  categorie: string;
  auteur: string;
  urgent: boolean;
  gratuit: boolean;
  prix?: string;
  created_at: string;
}

const categories = ["Tout", "🏠 Maison", "🔧 Bricolage", "🐶 Animaux", "📚 Cours", "💬 Écoute", "💻 Tech", "🌱 Jardin"];

const Index = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("Tout");
  const [likedIds, setLikedIds] = useState<number[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ type: "Tout", maxDistance: 999, prix: "all" });
  const [ville, setVille] = useState("Paris 11ème");
  const [demandes, setDemandes] = useState<Demande[]>([]);

  const fetchDemandes = async () => {
    const { data } = await supabase
      .from("demandes")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setDemandes(data);
  };

  useEffect(() => {
    fetchDemandes();
  }, []);

  const filtered = demandes.filter(d => {
    const matchSearch = d.titre.toLowerCase().includes(search.toLowerCase()) || d.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCat === "Tout" || d.categorie === selectedCat;
    const matchType = filters.type === "Tout" || d.categorie === filters.type;
    const matchPrix = filters.prix === "all" ||
      (filters.prix === "gratuit" && d.gratuit) ||
      (!d.gratuit && d.prix && parseFloat(d.prix.replace(/[^0-9.]/g, "")) <= parseFloat(filters.prix));
    return matchSearch && matchCat && matchType && matchPrix;
  });

  const toggleLike = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const activeFiltersCount = [
    filters.type !== "Tout",
    filters.maxDistance !== 999,
    filters.prix !== "all",
  ].filter(Boolean).length;

  const diff = Math.floor((Date.now() - new Date(created_at).getTime()) / 1000);

if (diff < 60) return "À l'instant";
if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;

return `Il y a ${Math.floor(diff / 86400)} j`;
  };

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
              <Button variant="ghost" size="icon" onClick={() => navigate("/mes-demandes")} title="Mes demandes">
                <ShoppingBag className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} title="Paramètres">
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
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 relative" onClick={() => setShowFilters(true)}>
              <Filter className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <CityPicker ville={ville} onChange={setVille} />
            <span className="ml-auto text-primary font-medium">{filtered.length} demandes autour de toi</span>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
          {categories.map(cat => (
  <button
    key={cat}
    onClick={() => setSelectedCat(cat)}
    className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
  >
    {cat}
  {items.map(item => (
  <div key={item.id}>
    ...
  </div>
))}

      <div className="flex-1 px-4 pt-4 pb-24 space-y-3">
        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-20">
            <p className="text-4xl mb-3">🕊️</p>
            <p className="font-medium">Aucune demande pour l'instant</p>
            <p className="text-sm mt-1">Sois le premier à poster !</p>
          </div>
        )}
        <AnimatePresence>
          {filtered.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    {d.auteur?.slice(0, 2).toUpperCase() || "??"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.auteur}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{ville}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{getTemps(d.created_at)}</span>
                    </div>
                  </div>
                <button onClick={(e) => toggleLike(d.id, e)} className="p-1">
  <Heart className="w-5 h-5 transition-colors" />
                  <Heart
  className={`w-5 h-5 transition-colors ${
    isLiked ? "text-red-500 fill-red-500" : "text-gray-400"
  }`}
/>
</button>
              

              <h3 className="font-semibold text-foreground mb-1">{d.titre}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{d.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs rounded-lg">{d.categorie}</Badge>
                  {d.urgent && <Badge className="bg-destructive text-destructive-foreground text-xs rounded-lg">⚡ Urgent</Badge>}
                </div>
                <span className="text-sm font-bold">
  {d.gratuit ? "Gratuit ❤️" : d.prix}
<AnimatePresence>
  {items.map(d => (
    <motion.div key={d.id}>
      <div>
        <span className="text-sm font-bold">
          {d.gratuit ? "Gratuit ❤️" : d.prix}
        </span>
      </div>
    </motion.div>
  ))}
</AnimatePresence>
        <Button size="lg" className="rounded-full h-14 w-14 shadow-xl shadow-primary/30 bg-primary text-primary-foreground" onClick={() => setShowForm(true)}>
          <Plus className="w-6 h-6" />
        </Button>
      </motion.div>

      <PostDemandeForm open={showForm} onClose={() => setShowForm(false)} onDemandeAdded={fetchDemandes} />
      <SearchFilters open={showFilters} onClose={() => setShowFilters(false)} filters={filters} onApply={setFilters} />
    </div>
  );
};

export default Index;
