import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const EditProfile = () => {
  const navigate = useNavigate();
  const [pseudo, setPseudo] = useState("Toi");
  const [bio, setBio] = useState("J'aime aider les gens autour de moi 🌿");
  const [ville, setVille] = useState("Paris 11ème");

  const handleSave = () => {
    toast.success("Profil mis à jour !");
    navigate("/settings");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/settings")} className="p-1"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
          <h1 className="text-lg font-bold text-foreground">Modifier le profil</h1>
          <button onClick={handleSave} className="p-1 text-primary"><Check className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="px-4 py-6 pb-28 space-y-6">
        {/* Avatar */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/15 text-primary flex items-center justify-center text-3xl font-bold">
              {pseudo[0]?.toUpperCase() || "T"}
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Pseudo</label>
          <Input value={pseudo} onChange={e => setPseudo(e.target.value)} className="h-11 rounded-xl bg-secondary border-none" maxLength={30} />
          <p className="text-[11px] text-muted-foreground mt-1 text-right">{pseudo.length}/30</p>
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Bio</label>
          <Textarea value={bio} onChange={e => setBio(e.target.value)} className="min-h-[80px] rounded-xl bg-secondary border-none resize-none" maxLength={200} />
          <p className="text-[11px] text-muted-foreground mt-1 text-right">{bio.length}/200</p>
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Ville</label>
          <Input value={ville} onChange={e => setVille(e.target.value)} className="h-11 rounded-xl bg-secondary border-none" />
        </div>

        <Button onClick={handleSave} className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25">
          Enregistrer
        </Button>
      </div>
    </div>
  );
};

export default EditProfile;
