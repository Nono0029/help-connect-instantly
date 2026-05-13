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
import { Illu } from "@/components/Illustrations";

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
  lat?: number;
  lng?: number;
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
  const [selectedCat, setSelectedCat] =
    useState("Tout");

  const [likedIds, setLikedIds] = useState<
    number[]
  >([]);

  const [showForm, setShowForm] =
    useState(false);

  const [showFilters, setShowFilters] =
    useState(false);

  const [filters, setFilters] = useState({
    type: "Tout",
    maxDistance: 999,
    prix: "all",
  });

  const [ville, setVille] =
    useState("Paris 11ème");

  const [villeCoords, setVilleCoords] =
    useState<[number, number]>([
      48.8589,
      2.3794,
    ]);

  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);

  const [demandes, setDemandes] = useState<
    Demande[]
  >([]);

  // FETCH
  const fetchDemandes = async () => {
    const { data } = await supabase
      .from("demandes")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    setDemandes(data || []);
  };

  useEffect(() => {
    fetchDemandes();
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // TIME
  const getTemps = (created_at: string) => {
    const diff = Math.floor(
      (Date.now() -
        new Date(created_at).getTime()) /
        1000
    );

    if (diff < 60) return "À l'instant";

    if (diff < 3600)
      return `Il y a ${Math.floor(
        diff / 60
      )} min`;

    if (diff < 86400)
      return `Il y a ${Math.floor(
        diff / 3600
      )} h`;

    return `Il y a ${Math.floor(
      diff / 86400
    )} j`;
  };

  // LIKE
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

  // FILTERS
  const filtered = demandes.filter((d) => {
    const matchSearch =
      d.titre
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      d.description
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchCat =
      selectedCat === "Tout" ||
      d.categorie === selectedCat;

    const matchType =
      filters.type === "Tout" ||
      d.categorie === filters.type;

    const matchPrix =
      filters.prix === "all" ||
      (filters.prix === "gratuit" &&
        d.gratuit) ||
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

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const sorted = userCoords
    ? [...filtered].sort((a, b) => {
        const dA = a.lat && a.lng ? getDistance(userCoords[0], userCoords[1], a.lat, a.lng) : 999;
        const dB = b.lat && b.lng ? getDistance(userCoords[0], userCoords[1], b.lat, b.lng) : 999;
        return dA - dB;
      })
    : filtered;

  const activeFiltersCount = [
    filters.type !== "Tout",
    filters.maxDistance !== 999,
    filters.prix !== "all",
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">

      {/* 🌈 BLOBS */}
      <div className="fixed top-[-100px] left-[-100px] w-72 h-72 bg-primary/20 blur-3xl rounded-full animate-blob pointer-events-none" />

      <div
        className="fixed top-[40%] right-[-80px] w-60 h-60 bg-accent/20 blur-3xl rounded-full animate-blob pointer-events-none"
        style={{ animationDelay: "3s" }}
      />

      <div
        className="fixed bottom-[-80px] left-[30%] w-56 h-56 bg-secondary/40 blur-3xl rounded-full animate-blob pointer-events-none"
        style={{ animationDelay: "6s" }}
      />

      {/* HEADER */}
      <header className="sticky top-0 z-50 glass border-b border-border">

        <div className="px-4 pt-4 pb-3">

          {/* TOP */}
          <div className="flex items-center justify-between mb-4">

            <div>

              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Deman
                <span className="text-primary">
                  dé
                </span>{" "}
                ✨
              </h1>

              <p className="text-xs text-muted-foreground mt-0.5">
                Aidons-nous autour de nous 🌱
              </p>

            </div>

            <div className="flex items-center gap-1.5">

              <NotificationBell />

              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  navigate("/mes-demandes")
                }
                className="rounded-2xl bg-primary/10 border border-primary/20 text-foreground hover:bg-primary/20 w-9 h-9"
              >
                <ShoppingBag className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  navigate("/messages")
                }
                className="rounded-2xl bg-accent/10 border border-accent/20 text-foreground hover:bg-accent/20 w-9 h-9"
              >
                <MessageCircle className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  navigate("/settings")
                }
                className="rounded-2xl bg-primary/10 border border-primary/20 text-foreground hover:bg-primary/20 w-9 h-9"
              >
                <User className="w-4 h-4" />
              </Button>

            </div>
          </div>

          {/* HERO */}
          <div className="mb-4 rounded-3xl p-5 bg-magic-gradient shadow-magic border border-primary/20 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xl font-black text-foreground leading-tight">
                Trouve de l'aide
                <br />
                près de chez toi 🌍
              </p>

              <p className="text-sm text-foreground/60 mt-1.5">
                Une communauté bienveillante pour s'entraider.
              </p>

              <div className="flex gap-2 mt-3 flex-wrap">
                {["🌱 Bienveillance", "⚡ Rapide", "💬 Humain"].map((t) => (
                  <div key={t} className="px-3 py-1 rounded-full bg-white/40 dark:bg-black/10 text-xs font-medium text-foreground border border-white/40 dark:border-white/10">
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden sm:block shrink-0">
              <Illu name="hero" className="w-36 h-36" />
            </div>
          </div>

          {/* SEARCH */}
          <div className="relative mb-3">

            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

            <Input
              placeholder="Rechercher une aide..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="pl-10 pr-10 h-12 rounded-2xl bg-background/70 border border-border text-foreground placeholder:text-muted-foreground backdrop-blur-sm"
            />

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl text-muted-foreground"
              onClick={() =>
                setShowFilters(true)
              }
            >
              <Filter className="w-4 h-4" />

              {activeFiltersCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>

          {/* CITY */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">

            <CityPicker
              ville={ville}
              onChange={(v, lat, lng) => {
                setVille(v);
                setVilleCoords([lat, lng]);
              }}
            />

            <span className="ml-auto text-accent font-semibold">
              {sorted.length} aides
              disponibles {userCoords ? "📍 près de toi" : "🌟"}
            </span>

          </div>
        </div>

        {/* CATEGORIES */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-4 scrollbar-hide">

          {categories.map((cat) => (

            <button
              key={cat}
              onClick={() =>
                setSelectedCat(cat)
              }
              className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
                selectedCat === cat
                  ? "bg-magic-gradient text-foreground shadow-warm border border-primary/30"
                  : "bg-background/60 border border-border text-muted-foreground hover:bg-primary/10"
              }`}
            >
              {cat}
            </button>

          ))}
        </div>
      </header>

      {/* MAP */}
      {!showForm && !showFilters && (
        <MapView
          demandes={filtered}
          ville={ville}
          lat={villeCoords[0]}
          lng={villeCoords[1]}
          userLat={userCoords?.[0]}
          userLng={userCoords?.[1]}
        />
      )}

      {/* LIST */}
      <div className="flex-1 px-4 pt-5 pb-28 space-y-4 relative z-10">

        {sorted.length === 0 && (
          <div className="text-center py-20">

            <div className="text-6xl mb-4 animate-float">
              🌸
            </div>

            <p className="font-bold text-foreground text-lg">
              Aucune aide trouvée
            </p>

            <p className="text-sm text-muted-foreground mt-2">
              Sois le premier à aider
              quelqu'un aujourd'hui 🐣
            </p>

          </div>
        )}

        <AnimatePresence>

          {sorted.map((d, i) => (

            <motion.div
              key={d.id}
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{ opacity: 0 }}
              transition={{
                delay: i * 0.03,
              }}
              onClick={() =>
                navigate(`/demande/${d.id}`)
              }
              className="card-magic cursor-pointer active:scale-[0.98]"
            >

              <div className="flex items-start justify-between mb-3">

                <div className="flex items-center gap-3">

                  <div className="w-11 h-11 rounded-full bg-magic-gradient flex items-center justify-center text-sm font-bold text-foreground shadow-warm">
                    {d.auteur
                      ?.slice(0, 2)
                      .toUpperCase() || "??"}
                  </div>

                  <div>

                    <p className="text-sm font-semibold text-foreground">
                      {d.auteur}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">

                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {d.ville || ville}
                      </span>

                      <span>•</span>

                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getTemps(
                          d.created_at
                        )}
                      </span>

                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) =>
                    toggleLike(d.id, e)
                  }
                  className="p-1"
                >
                  <Heart
                    className={`w-5 h-5 transition-all ${
                      likedIds.includes(d.id)
                        ? "fill-pink-400 text-pink-400 scale-110"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              </div>

              <h3 className="font-bold text-foreground mb-1 text-[15px]">
                {d.titre}
              </h3>

              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {d.description}
              </p>

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-2 flex-wrap">

                  <Badge className="rounded-xl bg-primary/15 text-foreground border-none text-xs">
                    {d.categorie}
                  </Badge>

                  {d.urgent && (
                    <Badge className="rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300 border-none text-xs">
                      ⚡ Urgent
                    </Badge>
                  )}

                </div>

                <span
                  className={`text-sm font-black ${
                    d.gratuit
                      ? "text-accent"
                      : "text-foreground"
                  }`}
                >
                  {d.gratuit
                    ? "Gratuit ❤️"
                    : `${d.prix} €`}
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
          className="btn-magic rounded-full h-16 w-16 shadow-glow border-0 font-bold"
          onClick={() =>
            setShowForm(true)
          }
        >
          <Plus className="w-7 h-7" />
        </Button>

      </motion.div>

      {/* MODALS */}
      <PostDemandeForm
        open={showForm}
        onClose={() =>
          setShowForm(false)
        }
        onDemandeAdded={fetchDemandes}
        ville={ville}
      />

      <SearchFilters
        open={showFilters}
        onClose={() =>
          setShowFilters(false)
        }
        filters={filters}
        onApply={setFilters}
      />
    </div>
  );
};

export default Index;
