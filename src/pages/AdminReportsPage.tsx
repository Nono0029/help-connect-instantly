import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flag, ShieldAlert, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Signal {
  id: number;
  mission_id: number;
  conversation_id: number;
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
  blocked: boolean;
}

const AdminReportsPage = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);

  const fetchSignals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("signals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erreur de chargement des signalements : " + error.message);
      setLoading(false);
      return;
    }
    setSignals((data as Signal[]) || []);

    const ids = Array.from(new Set((data || []).flatMap((s: Signal) => [s.reporter_id, s.reported_id]).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, pseudo, blocked").in("id", ids);
      const map: Record<string, ProfileLite> = {};
      (profs || []).forEach((p: ProfileLite) => { map[p.id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && isAdmin) fetchSignals();
  }, [authLoading, isAdmin]);

  const setStatut = async (signal: Signal, statut: "confirme" | "rejete") => {
    setActingId(signal.id);
    const { error } = await supabase.from("signals").update({ statut }).eq("id", signal.id);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success(statut === "confirme" ? "Signalement confirmé" : "Signalement rejeté");
      fetchSignals();
    }
    setActingId(null);
  };

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
        <p className="text-foreground font-semibold">Accès réservé aux administrateurs</p>
        <button onClick={() => navigate("/")} className="text-sm text-primary underline">Retour à l'accueil</button>
      </div>
    );
  }

  const statutLabel = (s: string) => s === "ouvert" ? "🟡 Ouvert" : s === "confirme" ? "✅ Confirmé" : s === "rejete" ? "❌ Rejeté" : s;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/settings")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground flex items-center gap-2">
            <Flag className="w-4 h-4" /> Signalements
          </h1>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : signals.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-10">Aucun signalement pour le moment.</p>
        ) : (
          signals.map((s) => {
            const reporter = s.reporter_id ? profiles[s.reporter_id] : null;
            const reported = s.reported_id ? profiles[s.reported_id] : null;
            return (
              <div key={s.id} className="bg-card rounded-2xl border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">{statutLabel(s.statut)}</span>
                  <span className="text-[11px] text-muted-foreground/60">{new Date(s.created_at).toLocaleString('fr-FR')}</span>
                </div>
                <p className="text-sm text-foreground">
                  <strong>{reporter?.pseudo || s.reporter_id}</strong> signale <strong>{reported?.pseudo || s.reported_id || "?"}</strong>
                  {reported?.blocked && <span className="ml-2 text-[11px] text-destructive font-semibold">🚫 Bloqué</span>}
                </p>
                <p className="text-sm text-foreground font-medium">{s.raison}</p>
                {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                {s.photos && s.photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pt-1">
                    {s.photos.map((p, i) => (
                      <img key={i} src={p} className="w-16 h-16 rounded-xl object-cover" />
                    ))}
                  </div>
                )}
                {s.statut === "ouvert" && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setStatut(s, "rejete")}
                      disabled={actingId === s.id}
                      className="flex-1 h-10 rounded-xl bg-muted border border-border text-muted-foreground font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {actingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Rejeter
                    </button>
                    <button
                      onClick={() => setStatut(s, "confirme")}
                      disabled={actingId === s.id}
                      className="flex-1 h-10 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {actingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirmer
                    </button>
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
