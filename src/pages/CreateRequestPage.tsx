import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Camera, Image, Euro, Clock, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const typesAide = [
  { id: "physique", label: "Aide physique", emoji: "💪" },
  { id: "bricolage", label: "Bricolage", emoji: "🔧" },
  { id: "tech", label: "Développement / Tech", emoji: "💻" },
  { id: "cours", label: "Cours / Tutorat", emoji: "📚" },
  { id: "animaux", label: "Animaux", emoji: "🐶" },
  { id: "ecoute", label: "Écoute / Social", emoji: "💬" },
  { id: "jardin", label: "Jardin / Plantes", emoji: "🌱" },
  { id: "transport", label: "Transport", emoji: "🚗" },
  { id: "autre", label: "Autre", emoji: "✨" },
];

const durees = ["< 30 min", "1h", "2h", "Demi-journée", "Journée", "Plusieurs jours"];

const CreateRequestPage = () => {
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
  const fileRef = useRef<HTMLInputElement>(null);

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
    if (!titre || !selectedType || !user) {
      toast.error("Remplis le titre et le type d'aide");
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
      auteur: user.email?.split("@")[0] || "Anonyme",
      user_id: user.id,
    }]);
    setLoading(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Demande publiée !");
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
            <h1 className="text-lg font-bold text-foreground">Nouvelle demande</h1>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5 pb-32">
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
            <Clock className="w-4 h-4 text-primary" /> Durée estimée
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
            <Euro className="w-4 h-4 text-primary" /> Budget
          </label>
          <div className="flex items-center gap-3">
            <button onClick={() => { setGratuit(true); setPrix(""); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                gratuit
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
              }`}>
              Gratuit
            </button>
            <div className="flex-1 relative">
              <Input type="number" placeholder="Prix proposé" value={prix} onChange={e => { setPrix(e.target.value); setGratuit(false); }} className="h-10 rounded-xl bg-secondary border-none pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">€</span>
            </div>
          </div>
        </div>

        <button onClick={() => setUrgent(!urgent)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
            urgent ? "bg-destructive/10 border-destructive" : "bg-secondary border-border"
          }`}>
          <span className="text-sm font-medium">C'est urgent</span>
          <div className={`w-10 h-6 rounded-full transition-all flex items-center px-0.5 ${urgent ? "bg-destructive justify-end" : "bg-muted-foreground/30"}`}>
            <div className="w-5 h-5 rounded-full bg-card shadow-sm" />
          </div>
        </button>

        <Button onClick={handleSubmit} disabled={!titre || !selectedType || loading} className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25">
          <Sparkles className="w-4 h-4 mr-2" />
          {loading ? "Publication..." : "Publier ma demande"}
        </Button>
      </div>
    </div>
  );
};

export default CreateRequestPage;
