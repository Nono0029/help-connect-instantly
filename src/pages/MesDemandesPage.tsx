import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Euro, Zap, PackageOpen } from "lucide-react";
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
  user_id?: string;
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
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    else setDemandes(data || []);

    setLoading(false);
  };

  useEffect(() => {
    fetchDemandes();
  }, [user]);

  // 🔥 DELETE + FERMETURE CONVERSATIONS + NOTIFS
 const handleDelete = async (id: number) => {
  setDeleting(true);

  try {
    // 1. Fermer toutes les conversations liées
    const { error: convError } = await supabase
      .from("conversations")
      .update({ statut: "fermée" })
      .eq("demande_id", id);

    if (convError) throw convError;

    // 2. Supprimer la demande
    const { error: deleteError } = await supabase
      .from("demandes")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    // 3. Update UI
    setDemandes(prev => prev.filter(d => d.id !== id));
    setConfirmDeleteId(null);

  } catch (err: any) {
    alert("Erreur : " + err.message);
  }

  setDeleting(false);
};

    // 3. envoyer notifications
    if (conversations) {
      for (const conv of conversations) {
        const otherUsers = [conv.helper_id, conv.demandeur_id];

        for (const userId of otherUsers) {
          if (!userId || userId === "EMPTY") continue;

          await supabase.from("notifications").insert([{
            user_id: userId,
            message: "❌ Une demande a été supprimée, la conversation est fermée.",
            conversation_id: conv.id,
            lu: false,
          }]);
        }
      }
    }

    // 4. supprimer demande
    const { error } = await supabase
      .from("demandes")
      .delete()
      .eq("id", id);

    setDeleting(false);

    if (error) {
      alert("Erreur suppression : " + error.message);
      return;
    }

    // 5. update UI
    setDemandes(prev => prev.filter(d => d.id !== id));
    setConfirmDeleteId(null);
  };

  const handleEdit = (d: Demande) => {
    setDemandeToEdit(d);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Mes demandes</h1>
          <span className="ml-auto text-sm text-muted-foreground">
            {demandes.length} publiée{demandes.length > 1 ? "s" : ""}
          </span>
        </div>
      </header>

      {/* LIST */}
      <div className="px-4 pt-4 pb-24 space-y-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-card rounded-2xl border animate-pulse" />
            ))}
          </div>
        )}

        {!loading && demandes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <PackageOpen className="w-12 h-12 text-muted-foreground/40" />
            <p className="font-semibold text-foreground">Aucune demande publiée</p>
            <p className="text-sm text-muted-foreground">
              Appuie sur + pour créer ta première demande
            </p>
          </div>
        )}

        <AnimatePresence>
          {demandes.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card rounded-2xl border p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {d.categorie}
                </span>

                {d.urgent && (
                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Urgent
                  </span>
                )}
              </div>

              <h3 className="font-semibold">{d.titre}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{d.description}</p>

              <div className="flex justify-between mt-3">
                <span className="flex items-center gap-1 text-xs">
                  <Euro className="w-3 h-3" />
                  {d.gratuit ? "Gratuit" : d.prix || "—"}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(d)}
                    className="px-3 py-1 rounded-xl bg-primary/10 text-primary text-xs"
                  >
                    <Pencil className="w-3 h-3 inline mr-1" />
                    Modifier
                  </button>

                  <button
                    onClick={() => setConfirmDeleteId(d.id)}
                    className="px-3 py-1 rounded-xl bg-destructive/10 text-destructive text-xs"
                  >
                    <Trash2 className="w-3 h-3 inline mr-1" />
                    Supprimer
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* CONFIRM DELETE */}
      <AnimatePresence>
        {confirmDeleteId !== null && (
          <motion.div className="fixed inset-0 bg-black/50 flex items-end z-50">
            <div className="bg-card w-full p-6 rounded-t-3xl">
              <h3 className="font-bold text-center mb-4">
                Supprimer la demande ?
              </h3>

              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-3 bg-secondary rounded-xl"
                >
                  Annuler
                </button>

                <button
                  onClick={() => handleDelete(confirmDeleteId)}
                  className="flex-1 py-3 bg-destructive text-white rounded-xl"
                >
                  {deleting ? "..." : "Supprimer"}
                </button>
              </div>
            </div>
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
