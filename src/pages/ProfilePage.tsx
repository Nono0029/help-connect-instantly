import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Star, Medal, Calendar, MessageCircle, ShoppingBag, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  pseudo: string;
  bio: string;
  ville: string;
  avatar_url: string;
}

interface Review {
  id: number;
  note: number;
  commentaire: string;
  created_at: string;
}

interface Mission {
  id: number;
  demande_id: number;
  statut: string;
  created_at: string;
  titre?: string;
}

const ProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [avis, setAvis] = useState<Review[]>([]);
  const [moyenne, setMoyenne] = useState(0);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [helperCount, setHelperCount] = useState(0);
  const [demandeurCount, setDemandeurCount] = useState(0);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      const { data: userData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (userData) setProfile(userData);

      const { data: avisData } = await supabase
        .from("avis")
        .select("*")
        .eq("cible_id", id)
        .order("created_at", { ascending: false });

      if (avisData) {
        setAvis(avisData);
        const total = avisData.reduce((acc, r) => acc + r.note, 0);
        setMoyenne(avisData.length > 0 ? total / avisData.length : 0);
      }

      const { data: missionsData } = await supabase
        .from("missions")
        .select("*")
        .or(`helper_id.eq.${id},demandeur_id.eq.${id}`)
        .eq("statut", "terminee")
        .order("created_at", { ascending: false });

      if (missionsData) {
        const demandeIds = [...new Set(missionsData.map(m => m.demande_id))];
        const { data: demandes } = await supabase
          .from("demandes")
          .select("id, titre")
          .in("id", demandeIds);

        const titreMap: Record<number, string> = {};
        (demandes || []).forEach(d => { titreMap[d.id] = d.titre; });

        setHelperCount(missionsData.filter(m => m.helper_id === id).length);
        setDemandeurCount(missionsData.filter(m => m.demandeur_id === id).length);
        setMissions(missionsData.map(m => ({
          ...m,
          titre: titreMap[m.demande_id] || "Mission",
        })));
      }

      setLoading(false);
    };

    load();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Profil introuvable</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Profil</h1>
        </div>
      </header>

      <div className="px-4 pt-6 space-y-5">
        {/* CARD PROFIL */}
        <div className="card-magic text-center">
          <div className="w-24 h-24 rounded-full bg-magic-gradient dark:bg-cyan-gradient mx-auto flex items-center justify-center text-3xl font-black text-foreground dark:text-white shadow-xl overflow-hidden">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              profile.pseudo?.[0]?.toUpperCase() || "?"
            )}
          </div>

          <h2 className="text-xl font-bold text-foreground mt-4">{profile.pseudo || "Anonyme"}</h2>

          {profile.ville && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5" /> {profile.ville}
            </p>
          )}

          {profile.bio && (
            <p className="text-sm text-foreground/70 mt-3 max-w-md mx-auto leading-relaxed">{profile.bio}</p>
          )}

          <div className="flex items-center justify-center gap-1 mt-4">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            <span className="text-lg font-bold text-foreground">{moyenne.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({avis.length} avis)</span>
          </div>

          <div className="flex items-center justify-center gap-1 mt-1">
            <Medal className="w-4 h-4 text-accent" />
            <span className="text-sm text-muted-foreground">{missions.length} mission{missions.length > 1 ? "s" : ""} accomplie{missions.length > 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-2">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <p className="text-xl font-bold text-foreground">{demandeurCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Demandes</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-xl font-bold text-foreground">{helperCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Propositions</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto mb-2">
              <Medal className="w-5 h-5" />
            </div>
            <p className="text-xl font-bold text-foreground">{missions.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Missions</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center mx-auto mb-2">
              <Star className="w-5 h-5" />
            </div>
            <p className="text-xl font-bold text-foreground">{moyenne.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Moyenne</p>
          </div>
        </div>

        {/* MISSIONS */}
        {missions.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Medal className="w-4 h-4 text-accent" />
              Missions terminées
            </h3>

            <div className="space-y-2">
              {missions.slice(0, 5).map(m => (
                <div key={m.id} className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.titre}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="rounded-full text-[10px]">✅ Terminée</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AVIS */}
        {avis.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              Avis reçus
            </h3>

            <div className="space-y-2">
              {avis.slice(0, 10).map(a => (
                <div key={a.id} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: a.note }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  {a.commentaire && (
                    <p className="text-sm text-foreground/80">{a.commentaire}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(a.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;