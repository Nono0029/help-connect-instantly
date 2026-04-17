import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Clock, Euro, Zap, PackageOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import PostDemandeForm from "@/components/PostDemandeForm";

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
  user_id: string;
}

const MesDemandesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [demandeToEdit, setDemandeToEdit] = useState<Demande | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDemandes = async () => {
    if (!user) return;
    setLoading(true);

const { data, error } = await supabase
  .from("demandes")
  .select("*");

if (error) {
  console.error(error);
  setLoading(false);
  return;
const { data: demandesData, error } = await supabase
  .from("demandes")
  .select("*");
  .setDemandes(demandesData);
  .or(`user_id.eq.${user_id},user_id.is.null`)
  .order("created_at", { ascending: false });

if (data) setDemandes(data);
setLoading(false);
if (data) setDemandes(data);
    setLoading(false);
  };

  useEffect(() => { fetchDemandes(); }, [user]);

  const handleDelete = async (id: number) => {
    setDeleting(true);
    const { error } = await supabase.from("demandes").delete().eq("id", id);
    setDeleting(false);
    if (error) {
      alert("Erreur suppression : " + error.message);
      setConfirmDeleteId(null);
      return;
    }
    setConfirmDeleteId(null);
    setDemandes(prev => prev.filter(d => d.id !== id));
  };

  const handleEdit = (d: Demande) => {
    setDemandeToEdit(d);
    setShowForm(true);
  };

  const getTemps = (created_at: string) => {
    const diff = Math.floor((Date.now() - new Date(created_at).getTime()) / 1000);
    if (diff < 60) return "À l'instant";
if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
return `Il y a ${Math.floor(diff / 86400)} j`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Mes demandes</h1>
          <span className="ml-auto text-sm text-muted-foreground">{demandes.length} publiée{demandes.length > 1 ? "s" : ""}</span>
        </div>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-card rounded-2xl border border-border animate-pulse" />
            ))}
          </div>
        )}

        {!loading && demandes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <PackageOpen className="w-12 h-12 text-muted-foreground/40" />
            <p className="font-semibold text-foreground">Aucune demande publiée</p>
            <p className="text-sm text-muted-foreground">Appuie sur + sur l'accueil pour créer ta première demande</p>
          </div>
        )}

        <AnimatePresence>
          {demandes.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card rounded-2xl border border-border p-4 shadow-sm"
            >
              <div className="flex-1 min-w-0 mb-2">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{d.categorie}</span>
                  {d.urgent && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive flex items-center gap-0.5">
                      <Zap className="w-3 h-3" /> Urgent
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-foreground truncate">{d.titre}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{d.description}</p>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-semibold">
  <Euro className="w-3 h-3" />
  {d.gratuit ? "Gratuit" : (d.prix || "—")}
</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(d)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Modifier
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(d.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Supprimer
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {confirmDeleteId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setConfirmDeleteId(null)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-card rounded-t-3xl p-6 pb-10 space-y-4"
            >
              <div className="flex justify-center">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="font-bold text-foreground text-lg">Supprimer la demande ?</h3>
                <p className="text-sm text-muted-foreground">Cette action est irréversible.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-medium text-sm">
                  Annuler
                </button>
                <button onClick={() => handleDelete(confirmDeleteId)} disabled={deleting} className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-medium text-sm disabled:opacity-60">
                  {deleting ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PostDemandeForm
        open={showForm}
        onClose={() => { setShowForm(false); setDemandeToEdit(null); }}
        onDemandeAdded={fetchDemandes}
        demandeToEdit={demandeToEdit}
      />
    </div>
  );
};

export default MesDemandesPage;
