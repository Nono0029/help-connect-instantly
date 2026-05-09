import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  Search,
  MapPin,
  Clock,
  Heart,
  Filter,
  User,
  Plus,
  ShoppingBag,
  MessageCircle,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { motion, AnimatePresence } from "framer-motion";

import PostDemandeForm from "@/components/PostDemandeForm";
import SearchFilters from "@/components/SearchFilters";
import CityPicker from "@/components/CityPicker";
import MapView from "@/components/MapView";
import NotificationBell from "@/components/NotificationBell";

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
  ville?: string;
}

const categories = [
  "Tout",
  "🏠 Maison",
  "🔧 Bricolage",
  "🐶 Animaux",
  "📚 Cours",
  "💬 Écoute",
  "💻 Tech",
  "🌱 Jardin",
];

const Index = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("Tout");

  const [likedIds, setLikedIds] = useState<number[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    type: "Tout",
    maxDistance: 999,
    prix: "all",
  });

  const [ville, setVille] = useState("Paris 11ème");

  const [villeCoords, setVilleCoords] = useState<[number, number]>([
    48.8589,
    2.3794,
  ]);

  const [demandes, setDemandes] = useState<Demande[]>([]);

  // 📥 FETCH DEMANDES
  const fetchDemandes = async () => {
    const { data, error } = await supabase
      .from("demandes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setDemandes(data || []);
  };

  useEffect(() => {
    fetchDemandes();
  }, []);

  // ⏰ TEMPS
  const getTemps = (created_at: string) => {
    const diff = Math.floor(
      (Date.now() - new Date(created_at).getTime()) / 1000
    );

    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;

    return `Il y a ${Math.floor(diff / 86400)} j`;
  };

  // ❤️ LIKE
  const toggleLike = (
    id: number,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();

    setLikedIds((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  };

  // 🔎 FILTERS
  const filtered = demandes.filter((d) => {
    const matchSearch =
      d.titre.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase());

    const matchCat =
      selectedCat === "Tout" ||
      d.categorie === selectedCat;

    const matchType =
      filters.type === "Tout" ||
      d.categorie === filters.type;

    const matchPrix =
      filters.prix === "all" ||
      (filters.prix === "gratuit" && d.gratuit) ||
      (!d.gratuit &&
        d.prix &&
        parseFloat(
          d.prix.replace(/[^0-9.]/g, "")
        ) <= parseFloat(filters.prix));

    return (
      matchSearch &&
      matchCat &&
      matchType &&
      matchPrix
    );
  });

  const activeFiltersCount = [
    filters.type !== "Tout",
    filters.maxDistance !== 999,
    filters.prix !== "all",
  ].filter(Boolean).length;

return (
  <div className="min-h-screen bg-[#071118] flex flex-col relative overflow-hidden">

    {/* BLOBS BACKGROUND */}
    <div className="absolute top-[-120px] left-[-120px] w-80 h-80 bg-blue-500/20 blur-3xl rounded-full" />

    <div className="absolute bottom-[-120px] right-[-120px] w-80 h-80 bg-green-500/20 blur-3xl rounded-full" />

    {/* HEADER */}
    <header className="sticky top-0 z-50 bg-[#071118]/80 backdrop-blur-2xl border-b border-white/5">

      <div className="px-4 pt-4 pb-3">

        {/* TOP */}
        <div className="flex items-center justify-between mb-4">

          {/* LOGO */}
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Deman<span className="text-blue-400">dé</span>
            </h1>

            <p className="text-xs text-blue-100/60 mt-0.5">
              Aidons-nous autour de nous 🌱
            </p>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-2">

            <NotificationBell />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/mes-demandes")}
              className="rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10"
            >
              <ShoppingBag className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/messages")}
              className="rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10"
            >
              <MessageCircle className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
              className="rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10"
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* HERO */}
        <div className="mb-5 rounded-3xl p-5 bg-gradient-to-br from-blue-500/20 to-green-500/20 border border-white/10 shadow-2xl">

          <p className="text-2xl font-black text-white leading-tight">
            Trouve de l’aide <br />
            près de chez toi 💙
          </p>

          <p className="text-sm text-blue-100/70 mt-2">
            Une communauté bienveillante pour s’entraider au quotidien.
          </p>

          <div className="flex gap-2 mt-4 flex-wrap">

            <div className="px-3 py-1.5 rounded-full bg-white/10 text-xs text-white">
              🌱 Bienveillance
            </div>

            <div className="px-3 py-1.5 rounded-full bg-white/10 text-xs text-white">
              ⚡ Rapide
            </div>

            <div className="px-3 py-1.5 rounded-full bg-white/10 text-xs text-white">
              💬 Humain
            </div>

          </div>
        </div>

        {/* SEARCH */}
        <div className="relative mb-3">

          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-100/50" />

          <Input
            placeholder="Rechercher une aide..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-10 h-12 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-blue-100/40"
          />

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl text-white"
            onClick={() => setShowFilters(true)}
          >
            <Filter className="w-4 h-4" />

            {activeFiltersCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        {/* CITY */}
        <div className="flex items-center gap-1 text-xs text-blue-100/60 mb-3">

          <CityPicker
            ville={ville}
            onChange={(v, lat, lng) => {
              setVille(v);
              setVilleCoords([lat, lng]);
            }}
          />

          <span className="ml-auto text-green-400 font-semibold">
            {filtered.length} aides disponibles
          </span>
        </div>
      </div>

      {/* CATEGORIES */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-4 scrollbar-hide">

        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
              selectedCat === cat
                ? "bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-xl"
                : "bg-white/5 border border-white/10 text-blue-100/70"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </header>

    {/* MAP */}
    {!showForm && (
      <MapView
        demandes={filtered}
        ville={ville}
        lat={villeCoords[0]}
        lng={villeCoords[1]}
      />
    )}

    {/* LIST */}
    <div className="flex-1 px-4 pt-5 pb-28 space-y-4 relative z-10">

      {/* EMPTY */}
      {filtered.length === 0 && (
        <div className="text-center text-blue-100/60 py-20">

          <div className="text-6xl mb-4">
            🌈
          </div>

          <p className="font-bold text-white text-lg">
            Aucune aide trouvée
          </p>

          <p className="text-sm mt-2">
            Sois le premier à aider quelqu’un aujourd’hui 💙
          </p>
        </div>
      )}

      {/* DEMANDES */}
      <AnimatePresence>

        {filtered.map((d, i) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => navigate(`/demande/${d.id}`)}
            className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 shadow-2xl hover:bg-white/[0.07] transition-all cursor-pointer active:scale-[0.98]"
          >

            {/* TOP */}
            <div className="flex items-start justify-between mb-3">

              <div className="flex items-center gap-3">

                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-green-400 text-white flex items-center justify-center text-sm font-bold shadow-lg">
                  {d.auteur?.slice(0, 2).toUpperCase() || "??"}
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    {d.auteur}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-blue-100/50">

                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {d.ville || ville}
                    </span>

                    <span>•</span>

                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {getTemps(d.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* LIKE */}
              <button
                onClick={(e) => toggleLike(d.id, e)}
                className="p-1"
              >
                <Heart
                  className={`w-5 h-5 transition-all ${
                    likedIds.includes(d.id)
                      ? "fill-pink-500 text-pink-500 scale-110"
                      : "text-blue-100/40"
                  }`}
                />
              </button>
            </div>

            {/* CONTENT */}
            <h3 className="font-bold text-white mb-1 text-[15px]">
              {d.titre}
            </h3>

            <p className="text-sm text-blue-100/60 line-clamp-2 mb-4">
              {d.description}
            </p>

            {/* FOOTER */}
            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2 flex-wrap">

                <Badge className="rounded-xl bg-blue-500/20 text-blue-200 border-none">
                  {d.categorie}
                </Badge>

                {d.urgent && (
                  <Badge className="rounded-xl bg-red-500/20 text-red-300 border-none">
                    ⚡ Urgent
                  </Badge>
                )}
              </div>

              <span
                className={`text-sm font-black ${
                  d.gratuit
                    ? "text-green-400"
                    : "text-white"
                }`}
              >
                {d.prix ? `${d.prix} €` : "Gratuit ❤️"}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>

    {/* FAB */}
    <motion.div
      className="fixed bottom-6 right-6 z-50"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        size="lg"
        className="rounded-full h-16 w-16 shadow-2xl bg-gradient-to-r from-blue-500 to-green-500 text-white border-0"
        onClick={() => setShowForm(true)}
      >
        <Plus className="w-7 h-7" />
      </Button>
    </motion.div>

    {/* FORM */}
    <PostDemandeForm
      open={showForm}
      onClose={() => setShowForm(false)}
      onDemandeAdded={fetchDemandes}
      ville={ville}
    />

    {/* FILTERS */}
    <SearchFilters
      open={showFilters}
      onClose={() => setShowFilters(false)}
      filters={filters}
      onApply={setFilters}
    />
  </div>
);
