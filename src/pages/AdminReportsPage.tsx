import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flag, ShieldAlert, Check, X, Loader2, MessageCircle, ShoppingBag, User, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Signal {
  id: number;
  mission_id: number | null;
  conversation_id: number | null;
  reporter_id: string;
  reported_id: string | null;
  raison: string;
  description: string | null;
  photos: string[] | null;
  statut: string;
  created_at: string;
}

interface ProfileLite {
  id: string;
  pseudo: string;
  avatar_url?: string;
  blocked: boolean;
  blocked_at?: string;
}

interface Conversation {
  id: number;
  helper_id: string;
  demandeur_id: string;
  statut: string;
}

interface Demande {
  id: number;
  titre: string;
  description: string;
  categorie: string;
  user_id: string;
}

const AdminReportsPage = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [conversations, setConversations] = useState<Record<number, Conversation>>({});
  const [demandes, setDemandes] = useState<Record<number, Demande>>({});
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "ouvert" | "confirme" | "rejete">("all");

  const fetchSignals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error("Erreur : " + error.message);
      setLoading(false);
      return;
    }
    setSignals((data as Signal[]) || []);

    const allIds = Array.from(new Set(
      (data || []).flatMap((s: Signal) => [s.reporter_id, s.reported_id].filter(Boolean))
    )) as string[];
    if (allIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, pseudo, avatar_url, blocked, blocked_at").in("id", allIds);
      const map: Record<string, ProfileLite> = {};
      (profs || []).forEach((p: ProfileLite) => { map[p.id] = p; });
      setProfiles(map);
    }

    const convIds = Array.from(new Set((data || []).map((s: Signal) => s.conversation_id).filter(Boolean))) as number[];
    if (convIds.length) {
      const { data: convs } = await supabase.from("conversations").select("id, helper_id, demandeur_id, statut").in("id", convIds);
      const convMap: Record<number, Conversation> = {};
      (convs || []).forEach((c: Conversation) => { convMap[c.id] = c; });
      setConversations(convMap);
    }

    const missionIds = Array.from(new Set((data || []).map((s: Signal) => s.mission_id).filter(Boolean))) as number[];
    if (missionIds.length) {
      const { data: missions } = await supabase.from("missions").select("id, demande_id").in("id", missionIds);
      const demandeIds = [...new Set((missions || []).map((m: any) => m.demande_id).filter(Boolean))];
      if (demandeIds.length) {
        const { data: dems } = await supabase.from("demandes").select("id, titre, description, categorie, user_id").in("id", demandeIds);
        const demMap: Record<number, Demande> = {};
        (dems || []).forEach((d: Demande) => { demMap[d.id] = d; });
        setDemandes(demMap);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && isAdmin) withTimeout(fetchSignals(), 15000, "adminSignals").catch(() => setLoading(false));
  }, [authLoading, isAdmin]);

  const handleBan = async (reportedId: string) => {
    if (!reportedId) return;
    if (!window.confirm("Bannir definitivement cet utilisateur ?")) return;
    setActingId(-1);
    const { error } = await supabase.from("profiles").update({ blocked: true, blocked_at: new Date().toISOString() }).eq("id", reportedId);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Utilisateur banni definitivement");
      fetchSignals();
    }
    setActingId(null);
  };

  const handleUnban = async (reportedId: string) => {
    if (!reportedId) return;
    if (!window.confirm("Revoquer le ban de cet utilisateur ?")) return;
    setActingId(-2);
    const { error } = await supabase.from("profiles").update({ blocked: false, blocked_at: null }).eq("id", reportedId);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Ban revoque");
      fetchSignals();
    }
    setActingId(null);
  };

  const handleReject = async (signal: Signal) => {
    setActingId(signal.id);
    const { error } = await supabase.from("signals").update({ statut: "rejete" }).eq("id", signal.id);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Signalement rejete (pas legitime)");
      fetchSignals();
    }
    setActingId(null);
  };

  const handleConfirm = async (signal: Signal) => {
    setActingId(signal.id);
    const { error } = await supabase.from("signals").update({ statut: "confirme" }).eq("id", signal.id);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Signalement confirme");
      fetchSignals();
    }
    setActingId(null);
  };

  const getSourceInfo = (s: Signal) => {
    if (s.conversation_id) {
      const conv = conversations[s.conversation_id];
      return {
        type: "conversation" as const,
        icon: MessageCircle,
        label: conv ? `Conversation #${s.conversation_id}` : `Conv #${s.conversation_id}`,
        link: `/chat/${s.conversation_id}`,
      };
    }
    if (s.mission_id) {
      const dem = Object.values(demandes)[0];
      if (dem) {
        return {
          type: "demande" as const,
          icon: ShoppingBag,
          label: dem.titre,
          link: `/demande/${dem.id}`,
        };
      }
    }
    return {
      type: "profile" as const,
      icon: User,
      label: "Profil",
      link: s.reported_id ? `/profile/${s.reported_id}` : null,
    };
  };

  const statutColor = (s: string) => {
    if (s === "ouvert") return "bg-yellow-500/15 text-yellow-600";
    if (s === "confirme") return "bg-destructive/15 text-destructive";
    if (s === "rejete") return "bg-green-500/15 text-green-600";
    return "bg-muted text-muted-foreground";
  };

  const statutLabel = (s: string) => {
    if (s === "ouvert") return "En attente";
    if (s === "confirme") return "Confirme";
    if (s === "rejete") return "Rejete";
    return s;
  };

  const raisonLabel = (r: string) => {
    const map: Record<string, string> = {
      bad_behavior: "Mauvais comportement",
      scam: "Arnaque / Fraude",
      inappropriate: "Contenu inapproprié",
      no_show: "Non-respect",
      incomplete: "Mission incomplete",
      other: "Autre",
    };
    return map[r] || r;
  };

  const filtered = filter === "all" ? signals : signals.filter(s => s.statut === filter);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center gap-3">
        <ShieldAlert className="w-10 h-10 text-destructive" />
        <p className="text-foreground font-semibold">Acces reserve aux administrateurs</p>
        <button onClick={() => navigate("/")} className="text-sm text-primary underline">Retour</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-[env(safe-area-inset-top)] z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground flex items-center gap-2">
            <Flag className="w-4 h-4" /> Signalements
            <span className="text-xs font-normal text-muted-foreground">({filtered.length})</span>
          </h1>
        </div>
      </header>

      <div className="px-4 pt-3 flex gap-2 overflow-x-auto">
        {(["all", "ouvert", "confirme", "rejete"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {f === "all" ? "Tous" : statutLabel(f)}
          </button>
        ))}
      </div>

      <div className="px-4 pt-3 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-10">Aucun signalement.</p>
        ) : (
          filtered.map((s) => {
            const reporter = s.reporter_id ? profiles[s.reporter_id] : null;
            const reported = s.reported_id ? profiles[s.reported_id] : null;
            const source = getSourceInfo(s);
            const SourceIcon = source.icon;

            return (
              <div key={s.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${statutColor(s.statut)}`}>
                    {statutLabel(s.statut)}
                  </span>
                  <span className="text-[11px] text-muted-foreground/60">
                    {new Date(s.created_at).toLocaleString('fr-FR')}
                  </span>
                </div>

                {source.link && (
                  <button
                    onClick={() => navigate(source.link)}
                    className="flex items-center gap-2 text-xs text-primary hover:underline"
                  >
                    <SourceIcon className="w-3.5 h-3.5" />
                    {source.label}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}

                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {reporter?.avatar_url ? (
                      <img src={reporter.avatar_url} className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {reporter?.pseudo?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <span className="truncate font-medium">{reporter?.pseudo || "Inconnu"}</span>
                  </div>
                  <span className="text-muted-foreground">-></span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {reported?.avatar_url ? (
                      <img src={reported.avatar_url} className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center text-[10px] font-bold text-destructive">
                        {reported?.pseudo?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <span className="truncate font-medium">{reported?.pseudo || "Inconnu"}</span>
                    {reported?.blocked && (
                      <span className="px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive text-[10px] font-bold">BANNI</span>
                    )}
                  </div>
                </div>

                <div className="bg-secondary/50 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-bold text-foreground">{raisonLabel(s.raison)}</p>
                  {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                </div>

                {s.photos && s.photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {s.photos.map((p, i) => (
                      <img key={i} src={p} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                    ))}
                  </div>
                )}

                {s.statut === "ouvert" && (
                  <div className="space-y-2 pt-1">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(s)}
                        disabled={actingId === s.id}
                        className="flex-1 h-10 rounded-xl bg-muted border border-border text-muted-foreground font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {actingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        Pas legitime
                      </button>
                      <button
                        onClick={() => handleConfirm(s)}
                        disabled={actingId === s.id}
                        className="flex-1 h-10 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {actingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Confirmer
                      </button>
                    </div>
                    {s.reported_id && (
                      <div className="flex gap-2">
                        {!reported?.blocked ? (
                          <button
                            onClick={() => handleBan(s.reported_id!)}
                            disabled={actingId === -1}
                            className="flex-1 h-10 rounded-xl bg-destructive text-white font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            Bannir definitivement
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnban(s.reported_id!)}
                            disabled={actingId === -2}
                            className="flex-1 h-10 rounded-xl bg-green-500/10 text-green-600 border border-green-500/20 font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            Revoquer le ban
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {s.statut !== "ouvert" && s.reported_id && (
                  <div className="pt-1">
                    {!reported?.blocked ? (
                      <button
                        onClick={() => handleBan(s.reported_id!)}
                        disabled={actingId === -1}
                        className="w-full h-9 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        Bannir definitivement
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnban(s.reported_id!)}
                        disabled={actingId === -2}
                        className="w-full h-9 rounded-xl bg-green-500/10 text-green-600 border border-green-500/20 font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        Revoquer le ban
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminReportsPage;
