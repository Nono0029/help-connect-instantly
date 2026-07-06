import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Clock,
  Heart,
  Filter,
  User,
  ShoppingBag,
  MessageCircle,
  Rocket,
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
import ImageLightbox from "@/components/ImageLightbox";
import { Illu } from "@/components/Illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";

import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/context/LanguageContext";
import { getDistance, formatTimeAgo } from "@/lib/utils";

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
  photos?: string[];
}

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const categoryKeys = [
    "Tout",
    "🧹 Ménage / Nettoyage",
    "📦 Déménagement",
    "🍳 Cuisine / Repas",
    "🛒 Courses / Achats",
    "📮 Portage / Livraison",
    "💪 Aide physique",
    "🔧 Bricolage",
    "🌱 Jardin / Plantes",
    "💻 Tech / Informatique",
    "📚 Cours / Tutorat",
    "🐶 Animaux",
    "💬 Écoute / Social",
    "🚗 Transport",
    "✨ Autre",
  ];

  const categoryLabels: Record<string, string> = {
    "Tout": t('home.all'),
    "🧹 Ménage / Nettoyage": t('home.menage'),
    "📦 Déménagement": t('home.demenagement'),
    "🍳 Cuisine / Repas": t('home.cuisine'),
    "🛒 Courses / Achats": t('home.courses'),
    "📮 Portage / Livraison": t('home.portage'),
    "💪 Aide physique": t('home.physical'),
    "🔧 Bricolage": t('home.diy'),
    "🌱 Jardin / Plantes": t('home.garden'),
    "💻 Tech / Informatique": t('home.tech'),
    "📚 Cours / Tutorat": t('home.tutoring'),
    "🐶 Animaux": t('home.animals'),
    "💬 Écoute / Social": t('home.listening'),
    "🚗 Transport": t('home.transport'),
    "✨ Autre": t('home.other'),
  };

  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] =
    useState("Tout");

  const [sortBy, setSortBy] = useState("distance");

  const [likedIds, setLikedIds] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('askoo-likes') || '[]'); } catch { return []; }
  });

  const [recentlyViewed, setRecentlyViewed] = useState<{ id: number; titre: string; viewed_at: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem('askoo-recent-views') || '[]').slice(0, 5); } catch { return []; }
  });

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

  const [boostedUserIds, setBoostedUserIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);

  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  // FETCH
  const fetchDemandes = async () => {
    setLoading(true);
    const { data: completedMissions } = await supabase
      .from("missions")
      .select("demande_id")
      .eq("statut", "terminee");
    const completedIds = completedMissions?.map(m => m.demande_id) || [];

    const { data } = await supabase
      .from("demandes")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    const filtered = (data || []).filter(d => !completedIds.includes(d.id));
    setDemandes(filtered);

    // Fetch boosted profiles
    const userIds = [...new Set(filtered.map(d => d.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, boost_until")
        .in("id", userIds);

      const boosted = new Set<string>();
      const now = new Date();
      profiles?.forEach(p => {
        if (p.boost_until && new Date(p.boost_until) > now) {
          boosted.add(p.id);
        }
      });
      setBoostedUserIds(boosted);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDemandes();
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // TIME
  const getTemps = (created_at: string) => formatTimeAgo(created_at, t);

  // LIKE
  const toggleLike = (
    id: number,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();

    setLikedIds((prev) => {
      const newIds = prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id];
      localStorage.setItem('askoo-likes', JSON.stringify(newIds));
      return newIds;
    });
  };

  // FILTERS
  const filtered = useMemo(() => demandes.filter((d) => {
    const matchSearch =
      d.titre
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase()) ||
      d.description
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase());

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
  }), [demandes, debouncedSearch, selectedCat, filters]);

  const categoryCounts = useMemo(() => {
    const baseFiltered = demandes.filter((d) => {
      const matchSearch =
        d.titre.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        d.description.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchType = filters.type === "Tout" || d.categorie === filters.type;
      const matchPrix =
        filters.prix === "all" ||
        (filters.prix === "gratuit" && d.gratuit) ||
        (!d.gratuit && d.prix && parseFloat(d.prix.replace(/[^0-9.]/g, "")) <= parseFloat(filters.prix));
      return matchSearch && matchType && matchPrix;
    });

    const counts: Record<string, number> = { "Tout": baseFiltered.length };
    for (const cat of categoryKeys) {
      if (cat === "Tout") continue;
      counts[cat] = baseFiltered.filter((d) => d.categorie === cat).length;
    }
    return counts;
  }, [demandes, debouncedSearch, filters]);

  const sorted = useMemo(() => {
    const copy = [...filtered];

    const boostedCompare = (a: Demande, b: Demande) => {
      const aBoosted = a.user_id ? boostedUserIds.has(a.user_id) : false;
      const bBoosted = b.user_id ? boostedUserIds.has(b.user_id) : false;
      if (aBoosted !== bBoosted) return aBoosted ? -1 : 1;
      return 0;
    };

    switch (sortBy) {
      case "priceAsc":
        return copy.sort((a, b) => {
          const boost = boostedCompare(a, b);
          if (boost !== 0) return boost;
          const pA = a.gratuit ? 0 : (a.prix ? parseFloat(a.prix.replace(/[^0-9.]/g, "")) : 999);
          const pB = b.gratuit ? 0 : (b.prix ? parseFloat(b.prix.replace(/[^0-9.]/g, "")) : 999);
          return pA - pB;
        });
      case "priceDesc":
        return copy.sort((a, b) => {
          const boost = boostedCompare(a, b);
          if (boost !== 0) return boost;
          const pA = a.gratuit ? 0 : (a.prix ? parseFloat(a.prix.replace(/[^0-9.]/g, "")) : 0);
          const pB = b.gratuit ? 0 : (b.prix ? parseFloat(b.prix.replace(/[^0-9.]/g, "")) : 0);
          return pB - pA;
        });
      case "recent":
        return copy.sort((a, b) => {
          const boost = boostedCompare(a, b);
          if (boost !== 0) return boost;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      case "urgent":
        return copy.sort((a, b) => {
          const boost = boostedCompare(a, b);
          if (boost !== 0) return boost;
          if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      case "distance":
      default:
        if (!userCoords) return filtered;
        return copy.sort((a, b) => {
          const boost = boostedCompare(a, b);
          if (boost !== 0) return boost;
          const dA = a.lat != null && a.lng != null ? getDistance(userCoords[0], userCoords[1], a.lat, a.lng) : 999;
          const dB = b.lat != null && b.lng != null ? getDistance(userCoords[0], userCoords[1], b.lat, b.lng) : 999;
          return dA - dB;
        });
    }
  }, [filtered, userCoords, sortBy, boostedUserIds]);

  const activeFiltersCount = useMemo(() => [
    filters.type !== "Tout",
    filters.maxDistance !== 999,
    filters.prix !== "all",
  ].filter(Boolean).length, [filters]);

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
                Ask<span className="text-primary">oo</span> ✨
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('home.tagline')}
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
          <div className="mb-4 rounded-3xl p-5 bg-magic-gradient dark:bg-cyan-gradient shadow-magic dark:shadow-dark-card border border-primary/20 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xl font-black text-foreground leading-tight">
                {t('home.heroTitle')}
                <br />
                {t('home.heroSubtitle')}
              </p>

              <p className="text-sm text-foreground/60 mt-1.5">
                {t('home.heroDesc')}
              </p>

              <div className="flex gap-2 mt-3 flex-wrap">
                {[t('home.tagBienveillance'), t('home.tagRapide'), t('home.tagHumain')].map((tag) => (
                  <div key={tag} className="px-3 py-1 rounded-full bg-white/40 dark:bg-black/10 text-xs font-medium text-foreground border border-white/40 dark:border-white/10">
                    {tag}
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
              placeholder={t('home.search')}
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

          {/* SORT */}
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
            {[
              { key: "distance", label: t('home.sortDistance') },
              { key: "priceAsc", label: t('home.sortPriceAsc') },
              { key: "priceDesc", label: t('home.sortPriceDesc') },
              { key: "recent", label: t('home.sortRecent') },
              { key: "urgent", label: t('home.sortUrgent') },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
                  sortBy === opt.key
                    ? "bg-primary/15 text-foreground border border-primary/30"
                    : "bg-background/60 border border-border text-muted-foreground hover:bg-primary/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
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
              {t('home.available', { count: sorted.length })} {userCoords ? t('home.nearYou') : "🌟"}
            </span>

          </div>
        </div>

        {/* CATEGORIES */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-4 scrollbar-hide">

          {categoryKeys.map((cat) => (
            <button
              key={cat}
              onClick={() =>
                setSelectedCat(cat)
              }
              className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
                selectedCat === cat
                  ? "bg-magic-gradient dark:bg-cyan-gradient text-foreground shadow-warm dark:shadow-dark-card border border-primary/30"
                  : "bg-background/60 border border-border text-muted-foreground hover:bg-primary/10"
              }`}
            >
              {categoryLabels[cat]}<span className="ml-1 opacity-60">({categoryCounts[cat] ?? 0})</span>
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
      <div className="flex-1 px-4 pt-5 pb-28 space-y-4 relative z-10 isolate">

        {loading && [1, 2, 3, 4].map(i => (
          <div key={i} className="card-magic">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-11 h-11 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="w-5 h-5 rounded" />
            </div>
            <Skeleton className="h-5 w-3/4 mb-1.5" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-2/3 mb-3" />
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-xl" />
                <Skeleton className="h-5 w-16 rounded-xl" />
              </div>
              <Skeleton className="h-5 w-12" />
            </div>
          </div>
        ))}

        {!loading && sorted.length === 0 && (
          <EmptyState
            icon="🌸"
            title={t('home.noResults')}
            description={t('home.noResultsDesc')}
          />
        )}

        {!loading && (
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
              onClick={() => {
                try {
                  const views = JSON.parse(localStorage.getItem('askoo-recent-views') || '[]');
                  const newView = { id: d.id, titre: d.titre, viewed_at: Date.now() };
                  const filtered = views.filter((v: any) => v.id !== d.id);
                  const updated = [newView, ...filtered].slice(0, 10);
                  localStorage.setItem('askoo-recent-views', JSON.stringify(updated));
                  setRecentlyViewed(updated.slice(0, 5));
                } catch {}
                navigate(`/demande/${d.id}`);
              }}
              className="card-magic cursor-pointer active:scale-[0.98]"
            >

              <div className="flex items-start justify-between mb-3">

                <div className="flex items-center gap-3">

                  <div className="w-11 h-11 rounded-full bg-magic-gradient dark:bg-cyan-gradient flex items-center justify-center text-sm font-bold text-foreground shadow-warm">
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

              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {d.description}
              </p>

              {d.photos && d.photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" onClick={e => e.stopPropagation()}>
                  {d.photos.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      loading="lazy"
                      onClick={() => setLightbox({ images: d.photos!, index: i })}
                      className="shrink-0 w-20 h-20 rounded-xl object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-2 flex-wrap">

                  <Badge className="rounded-xl bg-primary/15 text-foreground border-none text-xs">
                    {d.categorie}
                  </Badge>

                  {d.urgent && (
                    <Badge className="rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300 border-none text-xs">
                      ⚡ {t('home.urgent')}
                    </Badge>
                  )}

                  {d.user_id && boostedUserIds.has(d.user_id) && (
                    <Badge className="rounded-xl bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 border-none text-xs">
                      <Rocket className="w-3 h-3 mr-0.5" /> Boost
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
                    ? t('home.free')
                    : `${d.prix} €`}
                </span>

              </div>
            </motion.div>

          ))}
        </AnimatePresence>
        )}

        {/* RECENTLY VIEWED */}
        {!loading && recentlyViewed.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">{t('home.recentlyViewed')}</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {recentlyViewed.map((view) => (
                <button
                  key={view.id}
                  onClick={() => navigate(`/demande/${view.id}`)}
                  className="shrink-0 w-40 p-3 rounded-2xl bg-background/70 border border-border text-left hover:bg-primary/10 transition-all"
                >
                  <p className="text-xs font-semibold text-foreground line-clamp-2 mb-1">{view.titre}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(() => {
                      const diff = Math.floor((Date.now() - view.viewed_at) / 60000);
                      if (diff < 1) return t('time.justNow');
                      if (diff < 60) return t('time.minutesAgo', { n: diff });
                      const h = Math.floor(diff / 60);
                      if (h < 24) return t('time.hoursAgo', { n: h });
                      const d = Math.floor(h / 24);
                      return t('time.daysAgo', { n: d });
                    })()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

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

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onPrev={lightbox.index > 0 ? () => setLightbox(prev => prev ? { ...prev, index: prev.index - 1 } : null) : undefined}
          onNext={lightbox.index < lightbox.images.length - 1 ? () => setLightbox(prev => prev ? { ...prev, index: prev.index + 1 } : null) : undefined}
        />
      )}
    </div>
  );
};

export default Index;
