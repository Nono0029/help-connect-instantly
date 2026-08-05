import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Euro,
  Zap,
  PackageOpen,
  Archive,
  ArchiveX,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import PostDemandeForm from "@/components/PostDemandeForm";
import NotificationBell from "@/components/NotificationBell";
import { toast } from "sonner";
import { useTranslation } from "@/context/LanguageContext";
import { EmptyState } from "@/components/EmptyState";
import { isUrgentActive } from "@/lib/urgentFee";

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
  user_id?: string;
  archived?: boolean;
}

const MesDemandesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [responseCounts, setResponseCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [demandeToEdit, setDemandeToEdit] = useState<Demande | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const fetchDemandes = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("demandes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) console.error(error);
    else {
      setDemandes(data || []);
      if (data && data.length > 0) {
        const ids = data.map(d => d.id);
        const { data: convs } = await supabase
          .from("conversations")
          .select("demande_id")
          .in("demande_id", ids);
        const counts: Record<number, number> = {};
        (convs || []).forEach(c => { counts[c.demande_id] = (counts[c.demande_id] || 0) + 1; });
        setResponseCounts(counts);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    withTimeout(fetchDemandes(), 15000, "mesDemandes").catch(() => setLoading(false));
  }, [user?.id]);

  // 🔥 DELETE COMPLET (via fonction SQL SECURITY DEFINER)
  const handleDelete = async (id: number) => {
    setDeleting(true);

    try {
      const { error } = await supabase.rpc("delete_demande", { target_id: id });

      if (error) throw error;

      setDemandes((prev) => prev.filter((d) => d.id !== id));
      setConfirmDeleteId(null);
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    }

    setDeleting(false);
  };

  const handleArchive = async (id: number, archived: boolean) => {
    const { error } = await supabase.from("demandes").update({ archived }).eq("id", id);
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    setDemandes(prev => prev.map(d => d.id === id ? { ...d, archived: archived as any } : d));
  };

  const handleEdit = (d: Demande) => {
    setDemandeToEdit(d);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-background">

      {/* HEADER + 🔔 NOTIFICATIONS */}
      <header className="sticky top-[env(safe-area-inset-top)] z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">

          <button onClick={() => navigate("/")} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>

          <h1 className="text-lg font-bold text-foreground">
            {t('requests.title')}
          </h1>

          {/* 🔔 NOTIFICATION BELL */}
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />

            <span className="text-sm text-muted-foreground">
              {demandes.length} {demandes.length > 1 ? t('requests.publishedPlural') : t('requests.published')}
            </span>
          </div>
        </div>
      </header>

      {/* LIST */}
      <div className="px-4 pt-4 pb-24 space-y-3">

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-card rounded-2xl border border-border animate-pulse" />
            ))}
          </div>
        )}

        {!loading && (
          <>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 text-xs text-muted-foreground mb-2"
            >
              {showArchived ? <ArchiveX className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
              {showArchived ? t('requests.viewActive') : t('requests.viewArchived', { n: demandes.filter(d => d.archived).length })}
            </button>

            {demandes.filter(d => showArchived ? d.archived : !d.archived).length === 0 && (
              <EmptyState
                icon={PackageOpen}
                title={showArchived ? t('requests.noArchived') : t('requests.noPublished')}
                description=""
              />
            )}

            <AnimatePresence>
              {demandes.filter(d => showArchived ? d.archived : !d.archived).map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card rounded-2xl border border-border p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{d.categorie}</span>
                    {isUrgentActive(d.urgent, d.created_at) && (
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded flex items-center gap-1">
                        <Zap className="w-3 h-3" /> {t('requests.urgent')}
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold">{d.titre}</h3>
                  {d.description && <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{d.description}</p>}

                  <div className="flex justify-between items-center mt-3">
                    <span className="flex items-center gap-1 text-xs">
                      <Euro className="w-3 h-3" />
                      {d.gratuit ? t('requests.free') : d.prix || "—"}
                    </span>

                    <div className="flex gap-2">
                      {(responseCounts[d.id] ?? 0) > 0 && (
                        <span className="flex items-center gap-1 px-3 py-1 rounded-xl bg-accent/10 text-accent text-xs font-semibold" title={t('requests.responses')}>
                          <MessageCircle className="w-3 h-3" /> {responseCounts[d.id]}
                        </span>
                      )}
                      <button onClick={() => handleArchive(d.id, !d.archived)}
                        className={`px-3 py-1 rounded-xl text-xs ${d.archived ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}
                      >
                        <Archive className="w-3 h-3 inline mr-1" />
                        {d.archived ? t('requests.restore') : t('requests.archive')}
                      </button>
                      <button onClick={() => handleEdit(d)} className="px-3 py-1 rounded-xl bg-primary/10 text-primary text-xs">
                        <Pencil className="w-3 h-3 inline mr-1" /> {t('requests.edit')}
                      </button>
                      <button onClick={() => setConfirmDeleteId(d.id)} className="px-3 py-1 rounded-xl text-xs text-muted-foreground/70 hover:text-destructive transition-colors">
                        <Trash2 className="w-3 h-3 inline mr-1" /> {t('requests.delete')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* CONFIRM DELETE */}
      <AnimatePresence>
        {confirmDeleteId !== null && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50"
            onClick={() => setConfirmDeleteId(null)}
          >
              <motion.div
                onClick={(e) => e.stopPropagation()}
                className="bg-card w-full p-6 rounded-t-3xl space-y-4 pb-20"
              >
              <h3 className="font-bold text-center">
                {t('requests.deleteTitle')}
              </h3>

              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-3 bg-secondary rounded-xl"
                >
                  {t('requests.cancel')}
                </button>

                <button
                  onClick={() => handleDelete(confirmDeleteId)}
                  disabled={deleting}
                  className="flex-1 py-3 bg-destructive text-white rounded-xl disabled:opacity-60"
                >
                  {deleting ? t('requests.deleting') : t('requests.deleteBtn')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PostDemandeForm
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setDemandeToEdit(null);
        }}
        onDemandeAdded={fetchDemandes}
        demandeToEdit={demandeToEdit}
      />
    </div>
  );
};

export default MesDemandesPage;
