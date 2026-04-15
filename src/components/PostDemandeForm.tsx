import { useState, useRef, useEffect } from "react";
import { X, Camera, Image, Euro, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const typesAide = [
  { id: "physique", label: "💪 Aide physique", desc: "Déménagement, ménage, portage..." },
  { id: "bricolage", label: "🔧 Bricolage", desc: "Réparation, montage, plomberie..." },
  { id: "tech", label: "💻 Développement / Tech", desc: "Code, site web, informatique..." },
  { id: "cours", label: "📚 Cours / Tutorat", desc: "Maths, langues, musique..." },
  { id: "animaux", label: "🐶 Animaux", desc: "Garde, promenade, pet-sitting..." },
  { id: "ecoute", label: "💬 Écoute / Social", desc: "Discuter, accompagner, soutien..." },
  { id: "jardin", label: "🌱 Jardin / Plantes", desc: "Arrosage, tonte, entretien..." },
  { id: "transport", label: "🚗 Transport", desc: "Covoiturage, livraison, courses..." },
  { id: "autre", label: "✨ Autre", desc: "Tout ce qui ne rentre pas ailleurs" },
];

const durees = ["< 30 min", "1h", "2h", "Demi-journée", "Journée", "Plusieurs jours"];

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

interface Props {
  open: boolean;
  onClose: () => void;
  onDemandeAdded: () => void;
  demandeToEdit?: Demande | null;
}

const PostDemandeForm = ({ open, onClose, onDemandeAdded, demandeToEdit }: Props) => {
  const { user } = useAuth();
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [prix, setPrix] = useState("");
  const [gratuit, setGratuit] = useState(false);
  const [duree, setDuree] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isEdit = !!demandeToEdit;

  useEffect(() => {
    if (demandeToEdit) {
      setTitre(demandeToEdit.titre || "");
      setDescription(demandeToEdit.description || "");
      const typeMatch = typesAide.find(t => demandeToEdit.categorie?.includes(t.label));
      setSelectedType(typeMatch?.id || "autre");
      setPrix(demandeToEdit.prix || "");
      setGratuit(demandeToEdit.gratuit || false);
      setUrgent(demandeToEdit.urgent || false);
    } else {
      setTitre(""); setDescription(""); setSelectedType("");
      setPhotos([]); setPrix(""); setGratuit(false);
      setDuree(""); setUrgent(false);
    }
  }, [demandeToEdit, open]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setPhotos(prev => [...prev, reader.result as string].slice(0, 5));
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    if (!titre || !selectedType || !user) return;
    setLoading(true);

    const typeLabel = typesAide.find(t => t.id === selectedType)?.label || selectedType;
    const payload = { titre, description, categorie: typeLabel, prix: gratuit ? null : prix, gratuit, urgent };

    let error = null;
    if (isEdit && demandeToEdit) {
      const res = await supabase.from("demandes").update(payload).eq("id", demandeToEdit.id);
      error = res.error;
    } else {
      const auteur = user.email?.split("@")[0] || "Anonyme";
      const res = await supabase.from("demandes").insert([{ ...payload, auteur, user_id: user.id }]);
      error = res.error;
    }

    setLoading(false);
    if (error) {
      alert("Erreur : " + error.message);
    } else {
      onDemandeAdded();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl max-h-[92vh] overflow-y-auto"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
              <button onClick={onClose} className="text-muted-foreground p-1"><X className="w-5 h-5" /></button>
              <h2 className="text-base font-bold text-foreground">{isEdit ? "Modifier la demande" : "Poster une demande"}</h2>
              <div className="w-7" />
            </div>

            <div className="px-4 py-4 space-y-5">
              {!isEdit && (
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Photos <span className="text-muted-foreground font-normal">(optionnel, max 5)</span>
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    <button onClick={() => fileRef.current?.click()} className="shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-1 text-primary hover:bg-primary/10 transition-colors">
                      <Camera className="w-5 h-5" />
                      <span className="text-[10px] font-medium">Ajouter</span>
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhoto} />
                    {photos.map((src, i) => (
                      <div key={i} className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-border">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setPhotos(p => p.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground/70 text-background flex items-center justify-center">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {photos.length === 0 && (
                      <div className="shrink-0 w-20 h-20 rounded-xl border border-dashed border-border bg-muted/50 flex items-center justify-center">
                        <Image className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Titre de ta demande</label>
                <Input placeholder="Ex: Besoin d'aide pour déménager..." value={titre} onChange={e => setTitre(e.target.value)} className="h-11 rounded-xl bg-secondary border-none" maxLength={80} />
                <p className="text-[11px] text-muted-foreground mt-1 text-right">{titre.length}/80</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Décris ton besoin</label>
                <Textarea placeholder="Explique en détail ce dont tu as besoin, quand, où, etc." value={description} onChange={e => setDescription(e.target.value)} className="min-h-[100px] rounded-xl bg-secondary border-none resize-none" maxLength={500} />
                <p className="text-[11px] text-muted-foreground mt-1 text-right">{description.length}/500</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Type d'aide</label>
                <div className="flex flex-wrap gap-2">
                  {typesAide.map(type => (
                    <button key={type.id} onClick={() => setSelectedType(type.id)}
                      className={px-3 py-2 rounded-xl text-xs font-medium transition-all border \}>
                      {type.label}
                    </button>
                  ))}
                </div>
                {selectedType && <p className="text-xs text-muted-foreground mt-2 pl-1">{typesAide.find(t => t.id === selectedType)?.desc}</p>}
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" /> Durée estimée
                </label>
                <div className="flex flex-wrap gap-2">
                  {durees.map(d => (
                    <button key={d} onClick={() => setDuree(d)}
                      className={px-3 py-1.5 rounded-lg text-xs font-medium transition-all border \}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Euro className="w-4 h-4 text-primary" /> Budget
                </label>
                <div className="flex items-center gap-3">
                  <button onClick={() => { setGratuit(true); setPrix(""); }}
                    className={px-4 py-2 rounded-xl text-sm font-medium transition-all border \}>
                    ❤️ Gratuit
                  </button>
                  <div className="flex-1 relative">
                    <Input type="number" placeholder="Prix proposé" value={prix} onChange={e => { setPrix(e.target.value); setGratuit(false); }} className="h-10 rounded-xl bg-secondary border-none pr-8" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">€</span>
                  </div>
                </div>
              </div>

              <button onClick={() => setUrgent(!urgent)}
                className={w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all \}>
                <span className="text-sm font-medium">⚡ C'est urgent</span>
                <div className={w-10 h-6 rounded-full transition-all flex items-center px-0.5 \}>
                  <div className="w-5 h-5 rounded-full bg-card shadow-sm" />
                </div>
              </button>

              <Button onClick={handleSubmit} disabled={!titre || !selectedType || loading} className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25">
                <Sparkles className="w-4 h-4 mr-2" />
                {loading ? (isEdit ? "Modification..." : "Publication...") : (isEdit ? "Enregistrer les modifications" : "Publier ma demande")}
              </Button>

              <p className="text-center text-[11px] text-muted-foreground pb-4">
                {isEdit ? "Tes modifications seront visibles immédiatement" : "Ta demande sera visible par les personnes autour de toi"}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PostDemandeForm;