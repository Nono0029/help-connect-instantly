import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Camera, Image, Euro, Clock, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/context/LanguageContext";
import { getTotalEuros, isBoostActive } from "@/lib/urgentFee";
import CityPicker from "@/components/CityPicker";

const typesAide = [
  { id: "menage", label: "Ménage / Nettoyage", emoji: "🧹" },
  { id: "demenagement", label: "Déménagement", emoji: "📦" },
  { id: "cuisine", label: "Cuisine / Repas", emoji: "🍳" },
  { id: "courses", label: "Courses / Achats", emoji: "🛒" },
  { id: "portage", label: "Portage / Livraison", emoji: "📮" },
  { id: "physique", label: "Aide physique", emoji: "💪" },
  { id: "bricolage", label: "Bricolage", emoji: "🔧" },
  { id: "jardin", label: "Jardin / Plantes", emoji: "🌱" },
  { id: "admin", label: "Administratif", emoji: "📋" },
  { id: "compta", label: "Comptabilité", emoji: "💰" },
  { id: "juridique", label: "Juridique", emoji: "⚖️" },
  { id: "tech", label: "Tech / Informatique", emoji: "💻" },
  { id: "photo", label: "Photo / Vidéo", emoji: "📸" },
  { id: "design", label: "Design / Créatif", emoji: "🎨" },
  { id: "cours", label: "Cours / Tutorat", emoji: "📚" },
  { id: "langues", label: "Langues / Échange", emoji: "🌍" },
  { id: "musique", label: "Musique / Art", emoji: "🎵" },
  { id: "animaux", label: "Animaux", emoji: "🐶" },
  { id: "ecoute", label: "Écoute / Social", emoji: "💬" },
  { id: "bienetre", label: "Bien-être", emoji: "🧘" },
  { id: "enfants", label: "Garde d'enfants", emoji: "👶" },
  { id: "personnes agees", label: "Aide personnes âgées", emoji: "👴" },
  { id: "transport", label: "Transport", emoji: "🚗" },
  { id: "evenement", label: "Événement / Fête", emoji: "🎉" },
  { id: "mode", label: "Mode / Styling", emoji: "👗" },
  { id: "sante", label: "Santé / Bien-être", emoji: "🏥" },
  { id: "depannage", label: "Dépannage", emoji: "🔌" },
  { id: "autre", label: "Autre", emoji: "✨" },
];

const durees = ["< 30 min", "1h", "2h", "Demi-journée", "Journée", "Plusieurs jours"];

const CreateRequestPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  const [ville, setVille] = useState("");
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const [isBoosted, setIsBoosted] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("boost_until").eq("id", user.id).maybeSingle()
      .then(({ data }) => setIsBoosted(isBoostActive(data?.boost_until)));
  }, [user]);

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
    if (!titre || !selectedType || !user) {
      toast.error(t('createRequest.fillFields'));
      return;
    }
    if (!ville) {
      toast.error(t('createRequest.cityRequired'));
      return;
    }
    setLoading(true);
    const typeLabel = typesAide.find(t => t.id === selectedType)?.label || selectedType;
    const { error } = await supabase.from("demandes").insert([{
      titre,
      description,
      categorie: typeLabel,
      prix: gratuit ? null : prix,
      gratuit,
      urgent,
      ville,
      lat: lat || null,
      lng: lng || null,
      auteur: user.email?.split("@")[0] || "Anonyme",
      user_id: user.id,
      photos: photos.length > 0 ? photos : null,
    }]);
    setLoading(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success(t('createRequest.publishSuccess'));
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="p-1">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-bold text-foreground">{t('createRequest.title')}</h1>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5 pb-32">
        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">
            {t('createRequest.photos')} <span className="text-muted-foreground font-normal">{t('createRequest.photosOptional')}</span>
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => fileRef.current?.click()} disabled={uploadingPhoto} className="shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-1 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50">
              {uploadingPhoto ? (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
              <span className="text-[10px] font-medium">{uploadingPhoto ? t('createRequest.uploading') : t('createRequest.add')}</span>
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

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t('createRequest.titleField')}</label>
          <Input placeholder={t('createRequest.titlePlaceholder')} value={titre} onChange={e => setTitre(e.target.value)} className="h-11 rounded-xl bg-secondary border-none" maxLength={80} />
          <p className="text-[11px] text-muted-foreground mt-1 text-right">{titre.length}/80</p>
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t('createRequest.description')}</label>
          <Textarea placeholder={t('createRequest.descPlaceholder')} value={description} onChange={e => setDescription(e.target.value)} className="min-h-[100px] rounded-xl bg-secondary border-none resize-none" maxLength={500} />
          <p className="text-[11px] text-muted-foreground mt-1 text-right">{description.length}/500</p>
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t('createRequest.cityLabel')}</label>
          <CityPicker ville={ville} onChange={(v, la, lo) => { setVille(v); setLat(la); setLng(lo); }} />
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">{t('createRequest.helpType')}</label>
          <div className="flex flex-wrap gap-2">
            {typesAide.map(type => (
              <button key={type.id} onClick={() => setSelectedType(type.id)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                  selectedType === type.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                }`}>
                {type.emoji} {type.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary" /> {t('createRequest.duration')}
          </label>
          <div className="flex flex-wrap gap-2">
            {durees.map(d => (
              <button key={d} onClick={() => setDuree(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  duree === d
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                }`}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Euro className="w-4 h-4 text-primary" /> {t('createRequest.budget')}
          </label>
          <div className="flex items-center gap-3">
            <button onClick={() => { setGratuit(true); setPrix(""); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                gratuit
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
              }`}>
              {t('createRequest.free')}
            </button>
            <div className="flex-1 relative">
              <Input type="number" placeholder={t('createRequest.pricePlaceholder')} value={prix} onChange={e => { setPrix(e.target.value); setGratuit(false); }} className="h-10 rounded-xl bg-secondary border-none pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">€</span>
            </div>
          </div>
        </div>

        <button onClick={() => setUrgent(!urgent)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
            urgent ? "bg-destructive/10 border-destructive" : "bg-secondary border-border"
          }`}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t('createRequest.urgent')}</span>
            {urgent && <span className="text-xs text-destructive/70 font-medium">⚡ {t('home.urgentExtra')}</span>}
          </div>
          <div className={`w-10 h-6 rounded-full transition-all flex items-center px-0.5 ${urgent ? "bg-destructive justify-end" : "bg-muted-foreground/30"}`}>
            <div className="w-5 h-5 rounded-full bg-card shadow-sm" />
          </div>
        </button>

        {urgent && !gratuit && prix && (
          <div className="px-4 py-2.5 rounded-xl bg-destructive/5 border border-destructive/20 text-sm">
            <span className="font-semibold text-destructive">
              {isBoosted
                ? `Total : ${prix}€ + 2€ de frais (boost actif ✨)`
                : t('home.urgentTotal', { price: `${prix}€`, total: getTotalEuros(parseFloat(prix), true, false) })}
            </span>
          </div>
        )}

        <Button onClick={handleSubmit} disabled={!titre || !selectedType || loading} className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25">
          <Sparkles className="w-4 h-4 mr-2" />
          {loading ? t('createRequest.publishing') : t('createRequest.publishBtn')}
        </Button>
      </div>
    </div>
  );
};

export default CreateRequestPage;
