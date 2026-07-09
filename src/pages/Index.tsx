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
  Sparkles,
  Truck,
  UtensilsCrossed,
  ShoppingCart,
  Package,
  Dumbbell,
  Hammer,
  Sprout,
  Laptop,
  GraduationCap,
  PawPrint,
  Car,
  Star,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { motion, AnimatePresence } from "framer-motion";
import { isUrgentActive } from "@/lib/urgentFee";

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
  user_id?: string;
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

  const categoryIcons: Record<string, typeof Sprout> = {
    "🧹 Ménage / Nettoyage": Sparkles,
    "📦 Déménagement": Truck,
    "🍳 Cuisine / Repas": UtensilsCrossed,
    "🛒 Courses / Achats": ShoppingCart,
    "📮 Portage / Livraison": Package,
    "💪 Aide physique": Dumbbell,
    "🔧 Bricolage": Hammer,
    "🌱 Jardin / Plantes": Sprout,
    "💻 Tech / Informatique": Laptop,
    "📚 Cours / Tutorat": GraduationCap,
    "🐶 Animaux": PawPrint,
    "💬 Écoute / Social": MessageCircle,
    "🚗 Transport": Car,
    "✨ Autre": Star,
  };

  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] =
    useState("Tout");

  const [sortBy, setSortBy] = useState("distance");

  const [likedIds, setLikedIds] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('askoo-likes') || '[]'); } catch { return []; }
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
          const aUrgent = isUrgentActive(a.urgent, a.created_at);
          const bUrgent = isUrgentActive(b.urgent, b.created_at);
          if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;
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
    <div className="min-h-screen bg-background text-foreground flex flex-col relative">

      {/* HEADER */}
      <header className="sticky top-0 z-50 glass border-b border-border/60">

        <div className="px-4 pt-4 pb-3">

          {/* TOP */}
          <div className="flex items-center justify-between mb-4">

            <div>
              <h1 className="text-[26px] font-extrabold tracking-tight text-foreground font-display leading-none">
                Ask<span className="text-primary">oo</span>
                <span className="ml-1 text-base">✨</span>
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium tracking-wide">
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

          {/* HERO — liquid glass */}
          <div className="mb-4 hero-glass rounded-[2rem] overflow-hidden relative">
            <div className="flex items-center gap-3 px-5 pt-5 pb-4">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold tracking-widest uppercase text-primary/70 dark:text-primary/80 mb-1">
                  Entraide locale
                </p>
                <h2 className="text-[22px] font-extrabold text-foreground leading-[1.15] font-display">
                  {t('home.heroTitle')}
                  <br />
                  <span className="text-primary">{t('home.heroSubtitle')}</span>
                </h2>
                <p className="text-[12px] text-foreground/55 mt-1.5 leading-relaxed">
                  {t('home.heroDesc')}
                </p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {[t('home.tagBienveillance'), t('home.tagRapide'), t('home.tagHumain')].map((tag) => (
                    <span key={tag} className="px-2.5 py-1 rounded-full bg-white/45 dark:bg-white/8 text-[11px] font-semibold text-foreground/80 backdrop-blur-sm border border-white/50 dark:border-white/10">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="shrink-0 -mb-1">
                <Illu name="hero" className="w-32 h-32 drop-shadow-xl" />
              </div>
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
              className="pl-10 pr-10 h-12 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 backdrop-blur-xl text-foreground placeholder:text-muted-foreground shadow-sm"
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
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                  sortBy === opt.key
                    ? "bg-primary text-white shadow-sm shadow-primary/30 border-none"
                    : "bg-white/50 dark:bg-white/5 border border-white/60 dark:border-white/10 text-muted-foreground backdrop-blur-sm hover:bg-primary/10"
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
                  ? "bg-primary text-white shadow-sm shadow-primary/30 border-none"
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
              onClick={() => navigate(`/demande/${d.id}`)}
              className={`card-magic cursor-pointer active:scale-[0.98] overflow-hidden ${
                isUrgentActive(d.urgent, d.created_at) ? "border-l-[3px] !border-l-red-400 dark:!border-l-red-400" : ""
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-11 h-11 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                    {(() => {
                      const CatIcon = categoryIcons[d.categorie] || Star;
                      return <CatIcon className="w-5 h-5 text-secondary-foreground" />;
                    })()}
                    {d.user_id && boostedUserIds.has(d.user_id) && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center text-[8px]">⭐</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-foreground truncate">{d.auteur}</p>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{d.ville || ville}</span>
                      <span className="opacity-40 mx-0.5">·</span>
                      <Clock className="w-3 h-3 shrink-0" />
                      <span className="whitespace-nowrap">{getTemps(d.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {isUrgentActive(d.urgent, d.created_at) && (
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-accent text-accent-foreground whitespace-nowrap">
                      {t('home.urgentBadge')}
                    </span>
                  )}
                  <button onClick={(e) => toggleLike(d.id, e)} className="p-1">
                    <Heart className={`w-5 h-5 transition-all ${likedIds.includes(d.id) ? "fill-pink-400 text-pink-400 scale-110" : "text-muted-foreground/40"}`} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <h3 className="font-extrabold text-foreground text-[15px] leading-snug mb-1.5">{d.titre}</h3>
              <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed mb-3">{d.description}</p>

              {d.photos && d.photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mb-1 scrollbar-hide" onClick={e => e.stopPropagation()}>
                  {d.photos.map((src, i) => (
                    <img key={i} src={src} alt="" loading="lazy"
                      onClick={() => setLightbox({ images: d.photos!, index: i })}
                      className="shrink-0 w-20 h-20 rounded-xl object-cover border border-border/50 cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  ))}
                </div>
              )}

              {/* Divider */}
              <div className="h-px bg-border/40 mb-3" />

              {/* Footer */}
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-primary/10 text-foreground/80 truncate max-w-[130px]">
                  {d.categorie}
                </span>
                {d.user_id && boostedUserIds.has(d.user_id) && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300 whitespace-nowrap">
                    🚀 Pro
                  </span>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/demande/${d.id}`); }}
                className="btn-magic w-full text-[14px] py-3 rounded-2xl"
              >
                {t('home.respond')} · {d.gratuit ? t('home.free') : `${d.prix} €`}
              </button>
            </motion.div>

          ))}
        </AnimatePresence>
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
