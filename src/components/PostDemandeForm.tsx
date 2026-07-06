import { useState, useRef, useEffect } from "react";
import { X, Camera, Image, Euro, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import CityPicker from "@/components/CityPicker";
import { toast } from "sonner";
import { useTranslation } from "@/context/LanguageContext";

const typesAide = [
  { id: "menage", label: "🧹 Ménage / Nettoyage", desc: "Cleaning, ranging, organisation..." },
  { id: "demenagement", label: "📦 Déménagement", desc: "Déménager, transporter des meubles..." },
  { id: "cuisine", label: "🍳 Cuisine / Repas", desc: "Cuisiner, livrer un repas..." },
  { id: "courses", label: "🛒 Courses / Achats", desc: "Acheter, rapporter des courses..." },
  { id: "portage", label: "📮 Portage / Livraison", desc: "Rapporter un objet, livrer un colis..." },
  { id: "physique", label: "💪 Aide physique", desc: "Portage, aide mobile, jardinage..." },
  { id: "bricolage", label: "🔧 Bricolage", desc: "Réparation, montage, plomberie..." },
  { id: "jardin", label: "🌱 Jardin / Plantes", desc: "Arrosage, tonte, entretien..." },
  { id: "admin", label: "📋 Administratif", desc: "Démarches, papiers, formulaires..." },
  { id: "compta", label: "💰 Comptabilité", desc: "Impôts, budget, factures..." },
  { id: "juridique", label: "⚖️ Juridique", desc: "Conseil légal, contrats..." },
  { id: "tech", label: "💻 Tech / Informatique", desc: "Code, site web, dépannage..." },
  { id: "photo", label: "📸 Photo / Vidéo", desc: "Portrait, événement, montage..." },
  { id: "design", label: "🎨 Design / Créatif", desc: "Logo, affiche, graphisme..." },
  { id: "cours", label: "📚 Cours / Tutorat", desc: "Maths, langues, soutien scolaire..." },
  { id: "langues", label: "🌍 Langues / Échange", desc: "Pratiquer, traduire, converser..." },
  { id: "musique", label: "🎵 Musique / Art", desc: "Cours, accompagnement, création..." },
  { id: "animaux", label: "🐶 Animaux", desc: "Garde, promenade, pet-sitting..." },
  { id: "ecoute", label: "💬 Écoute / Social", desc: "Discuter, accompagner, soutien..." },
  { id: "bienetre", label: "🧘 Bien-être", desc: "Méditation, yoga, relaxation..." },
  { id: "enfants", label: "👶 Garde d'enfants", desc: "Garde, babysitting, aide aux devoirs..." },
  { id: "personnes agees", label: "👴 Aide personnes âgées", desc: "Compagnie, courses, démarches..." },
  { id: "transport", label: "🚗 Transport", desc: "Covoiturage, accompagner, déplacer..." },
  { id: "evenement", label: "🎉 Événement / Fête", desc: "Organisation, déco, animation..." },
  { id: "mode", label: "👗 Mode / Styling", desc: "Conseil, retouche, shopping..." },
  { id: "sante", label: "🏥 Santé / Bien-être", desc: "Accompagnement, conseil, aide..." },
  { id: "depannage", label: "🔌 Dépannage", desc: "Objets cassés, pannes, réparations..." },
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
}

interface Props {
  ville?: string;
  open: boolean;
  onClose: () => void;
  onDemandeAdded: () => void;
  demandeToEdit?: Demande | null;
}

const PostDemandeForm = ({ open, onClose, onDemandeAdded, demandeToEdit, ville }: Props) => {
  const { t } = useTranslation();
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
  const [villeForm, setVilleForm] = useState("");
  const [villeLat, setVilleLat] = useState(0);
  const [villeLng, setVilleLng] = useState(0);
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
      setDuree(""); setUrgent(false); setVilleForm("");
    }
  }, [demandeToEdit, open]);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploadingPhoto(true);
    for (const file of Array.from(files)) {
      const fileExt = file.name.split(".").pop();
      const filePath = `demandes/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("demande-photos")
        .upload(filePath, file);
      if (uploadError) {
        console.error(uploadError);
        continue;
      }
      const { data: urlData } = supabase.storage.from("demande-photos").getPublicUrl(filePath);
      setPhotos(prev => [...prev, urlData.publicUrl].slice(0, 5));
    }
    setUploadingPhoto(false);
  };

  const handleSubmit = async () => {
  if (!titre || !selectedType || !villeForm) return;

  setLoading(true);

  const typeLabel =
    typesAide.find((t) => t.id === selectedType)?.label ||
    selectedType;

  const isGratuit = prix.trim() === "";

  const payload = {
    titre,
    description,
    categorie: typeLabel,
    gratuit: isGratuit,
    prix: isGratuit ? null : prix,
    urgent,
    duree: duree || null,
    ville: villeForm || ville || "",
    lat: villeLat || null,
    lng: villeLng || null,
    photos: photos.length > 0 ? photos : null,
  };

  let error = null;

  // ✏️ UPDATE
  if (isEdit && demandeToEdit) {

    const res = await supabase
      .from("demandes")
      .update(payload)
      .eq("id", demandeToEdit.id);

    error = res.error;

  } else {

    // ➕ INSERT
    const auteur =
      user?.email?.split("@")[0] || "Anonyme";

    const res = await supabase
      .from("demandes")
      .insert([
        {
          ...payload,

          auteur,

          user_id: user?.id,
        },
      ]);

    error = res.error;
  }

  setLoading(false);

  if (error) {

    toast.error("Erreur : " + error.message);

  } else {

    // ✅ RESET FORM
    setTitre("");
    setDescription("");
    setSelectedType("");
    setPhotos([]);
    setPrix("");
    setGratuit(false);
    setDuree("");
    setUrgent(false);
    setVilleLat(0);
    setVilleLng(0);

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
              <h2 className="text-base font-bold text-foreground">{isEdit ? t('postForm.editTitle') : t('postForm.createTitle')}</h2>
              <div className="w-7" />
            </div>

            <div className="px-4 py-4 space-y-5">
              {!isEdit && (
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    {t('postForm.photos')} <span className="text-muted-foreground font-normal">{t('postForm.photosOptional')}</span>
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    <button onClick={() => fileRef.current?.click()} disabled={uploadingPhoto} className="shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-1 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50">
                      {uploadingPhoto ? (
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5" />
                      )}
                      <span className="text-[10px] font-medium">{uploadingPhoto ? t('postForm.uploading') : t('postForm.add')}</span>
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
                <label className="text-sm font-semibold text-foreground mb-1.5 block">{t('postForm.titleField')}</label>
                <Input placeholder={t('postForm.titlePlaceholder')} value={titre} onChange={e => setTitre(e.target.value)} className="h-11 rounded-xl bg-secondary border-none" maxLength={80} />
                <p className="text-[11px] text-muted-foreground mt-1 text-right">{titre.length}/80</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">{t('postForm.description')}</label>
                <Textarea placeholder={t('postForm.descPlaceholder')} value={description} onChange={e => setDescription(e.target.value)} className="min-h-[100px] rounded-xl bg-secondary border-none resize-none" maxLength={500} />
                <p className="text-[11px] text-muted-foreground mt-1 text-right">{description.length}/500</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">{t('postForm.cityField')}</label>
                <div className="h-11 rounded-xl bg-secondary px-4 flex items-center">
                  <CityPicker
                    ville={villeForm || t('postForm.cityFallback')}
                    onChange={(v, lat, lng) => { setVilleForm(v); setVilleLat(lat); setVilleLng(lng); }}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">{t('postForm.helpType')}</label>
                <div className="flex flex-wrap gap-2">
                  {typesAide.map(type => (
                    <button key={type.id} onClick={() => setSelectedType(type.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                        selectedType === type.id
                          ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                          : "bg-secondary text-muted-foreground border-transparent hover:border-primary/30"
                      }`}>
                      {type.label}
                    </button>
                  ))}
                </div>
                {selectedType && <p className="text-xs text-muted-foreground mt-2 pl-1">{typesAide.find(t => t.id === selectedType)?.desc}</p>}
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" /> {t('postForm.duration')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {durees.map(d => (
                    <button key={d} onClick={() => setDuree(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        duree === d
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-muted-foreground border-transparent"
                      }`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Euro className="w-4 h-4 text-primary" /> {t('postForm.budget')}
                </label>
                <div className="flex items-center gap-3">
                  <button onClick={() => { setGratuit(true); setPrix(""); }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                      gratuit
                        ? "bg-accent text-accent-foreground border-accent shadow-md"
                        : "bg-secondary text-muted-foreground border-transparent"
                    }`}>
                    {t('postForm.free')}
                  </button>
                  <div className="flex-1 relative">
                    <Input type="number" placeholder={t('postForm.pricePlaceholder')} value={prix} onChange={e => { setPrix(e.target.value); setGratuit(false); }} className="h-10 rounded-xl bg-secondary border-none pr-8" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">€</span>
                  </div>
                </div>
              </div>

              <button onClick={() => setUrgent(!urgent)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  urgent
                    ? "bg-destructive/10 border-destructive/30 text-destructive"
                    : "bg-secondary border-transparent text-muted-foreground"
                }`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t('postForm.urgent')}</span>
                  {urgent && <span className="text-xs text-destructive/70 font-medium">⚡ {t('home.urgentExtra')}</span>}
                </div>
                <div className={`w-10 h-6 rounded-full transition-all flex items-center px-0.5 ${
                  urgent ? "bg-destructive justify-end" : "bg-muted-foreground/20 justify-start"
                }`}>
                  <div className="w-5 h-5 rounded-full bg-card shadow-sm" />
                </div>
              </button>

              {urgent && !gratuit && prix && (
                <div className="px-4 py-2.5 rounded-xl bg-destructive/5 border border-destructive/20 text-sm">
                  <span className="font-semibold text-destructive">
                    {t('home.urgentTotal', { price: `${prix}€`, total: `${parseFloat(prix) + 3}` })}
                  </span>
                </div>
              )}

              <Button onClick={handleSubmit} disabled={!titre || !selectedType || !villeForm || loading} className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25">
                <Sparkles className="w-4 h-4 mr-2" />
                {loading ? (isEdit ? t('postForm.editSaving') : t('postForm.createSaving')) : (isEdit ? t('postForm.editBtn') : t('postForm.createBtn'))}
              </Button>

              <p className="text-center text-[11px] text-muted-foreground pb-4">
                {isEdit ? t('postForm.editHelper') : t('postForm.createHelper')}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PostDemandeForm;
