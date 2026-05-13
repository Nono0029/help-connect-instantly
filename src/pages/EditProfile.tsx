import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Check,
  Star,
  MapPin,
  Home,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const EditProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [pseudo, setPseudo] = useState("");
  const [bio, setBio] = useState("");
  const [ville, setVille] = useState("");
  const [adresse, setAdresse] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [avis, setAvis] = useState<any[]>([]);
  const [moyenne, setMoyenne] = useState(0);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // ---------------- LOAD PROFILE ----------------
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        return;
      }

      if (data) {
        setPseudo(data.pseudo || "");
        setBio(data.bio || "");
        setVille(data.ville || "");
        setAdresse(data.adresse || "");
        setAvatarUrl(data.avatar_url || "");
      }
    };

    loadProfile();
  }, [user]);

  // ---------------- LOAD REVIEWS ----------------
  useEffect(() => {
    const loadAvis = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("avis")
        .select("*")
        .eq("cible_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      if (data) {
        setAvis(data);
        const total = data.reduce((acc, item) => acc + item.note, 0);
        setMoyenne(data.length > 0 ? total / data.length : 0);
      }
    };

    loadAvis();
  }, [user]);

  // ---------------- UPLOAD AVATAR ----------------
  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      setAvatarUrl(publicUrl);

      await supabase.from("profiles").upsert({
        id: user.id,
        avatar_url: publicUrl,
      });

      toast.success("Photo de profil mise à jour ✨");
    } catch (err: any) {
      toast.error("Erreur: " + err.message);
    }

    setUploading(false);
  };

  // ---------------- SAVE PROFILE ----------------
  const handleSave = async () => {
    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        pseudo,
        bio,
        ville,
        adresse,
        avatar_url: avatarUrl,
      });

    setLoading(false);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
      console.error(error);
      return;
    }

    toast.success("Profil mis à jour 💙");
    navigate("/settings");
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden transition-colors duration-300">

      {/* BACKGROUND BLOBS */}
      <div className="absolute top-[-100px] left-[-100px] w-[250px] h-[250px] bg-primary/20 blur-[100px] rounded-full" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[250px] h-[250px] bg-accent/20 blur-[100px] rounded-full" />

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/settings")}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>

          <h1 className="text-lg font-bold text-foreground">Modifier le profil</h1>

          <button
            onClick={handleSave}
            className="w-10 h-10 rounded-full btn-magic flex items-center justify-center shadow-lg"
          >
            <Check className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="px-4 py-6 pb-28 space-y-6 relative z-10">

        {/* AVATAR */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-magic-gradient dark:bg-cyan-gradient flex items-center justify-center text-4xl font-black text-foreground dark:text-white shadow-2xl overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                (pseudo?.[0]?.toUpperCase() || "?")
              )}
            </div>

            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={uploadAvatar}
            />
          </div>
        </div>

        {/* NOTE */}
        <div className="rounded-3xl bg-card border border-border p-5 text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
            <p className="text-3xl font-black text-foreground">{moyenne.toFixed(1)}</p>
          </div>
          <p className="text-sm text-muted-foreground">{avis.length} avis reçus</p>
        </div>

        {/* PSEUDO */}
        <div>
          <label className="text-sm font-semibold mb-2 block text-foreground">Pseudo</label>
          <Input
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            className="h-12 rounded-2xl bg-secondary border-none text-foreground"
            maxLength={30}
            placeholder="Ton pseudo"
          />
          <p className="text-[11px] text-muted-foreground mt-1 text-right">{pseudo.length}/30</p>
        </div>

        {/* BIO */}
        <div>
          <label className="text-sm font-semibold mb-2 block text-foreground">Bio</label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="min-h-[100px] rounded-2xl bg-secondary border-none text-foreground resize-none"
            maxLength={200}
            placeholder="Parle un peu de toi 🌱"
          />
          <p className="text-[11px] text-muted-foreground mt-1 text-right">{bio.length}/200</p>
        </div>

        {/* VILLE */}
        <div>
          <label className="text-sm font-semibold mb-2 block text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Ville
          </label>
          <Input
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            className="h-12 rounded-2xl bg-secondary border-none text-foreground"
            placeholder="Paris..."
          />
        </div>

        {/* ADRESSE */}
        <div>
          <label className="text-sm font-semibold mb-2 block text-foreground flex items-center gap-2">
            <Home className="w-4 h-4 text-primary" />
            Adresse
          </label>
          <Input
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            className="h-12 rounded-2xl bg-secondary border-none text-foreground"
            placeholder="12 rue..."
          />
          <p className="text-xs text-muted-foreground mt-2">
            Cette adresse pourra être envoyée automatiquement dans les discussions 💙
          </p>
        </div>

        {/* SAVE BUTTON */}
        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full h-14 rounded-2xl text-base font-bold btn-magic border-0"
        >
          {loading ? "Sauvegarde..." : "Enregistrer"}
        </Button>

        {/* AVIS */}
        <div className="space-y-3 pt-4">
          <h2 className="text-xl font-black text-foreground">Avis reçus ⭐</h2>

          {avis.length === 0 && (
            <div className="rounded-2xl bg-card border border-border p-4 text-sm text-muted-foreground">
              Aucun avis pour le moment
            </div>
          )}

          {avis.map((item) => (
            <div key={item.id} className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: item.note }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-foreground/90">{item.commentaire || "Pas de commentaire"}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default EditProfile;
