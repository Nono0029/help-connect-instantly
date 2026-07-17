import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Check,
  Star,
  MapPin,
  Home,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/context/LanguageContext";
import { Capacitor } from "@capacitor/core";

const EditProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [pseudo, setPseudo] = useState("");
  const [bio, setBio] = useState("");
  const [ville, setVille] = useState("");
  const [adresse, setAdresse] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  const predefinedSkills = [
    "Bricolage", "Jardinage", "Informatique", "Cours", "Ménage",
    "Transport", "Animaux", "Cuisine", "Menuiserie", "Électricité"
  ];

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
        setSkills(Array.isArray(data.skills) ? data.skills : []);
      }
    };

    loadProfile();
  }, [user?.id]);

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
        const total = data.reduce((acc, item) => acc + (item.note ?? 0), 0);
        setMoyenne(data.length > 0 ? total / data.length : 0);
      }
    };

    loadAvis();
  }, [user?.id]);

  // ---------------- UPLOAD AVATAR ----------------
  const uploadAvatar = async (e?: React.ChangeEvent<HTMLInputElement>) => {
    let file: File | undefined;

    if (!user) {
      toast.error("Session expirée. Reconnectez-vous.");
      return;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
        const image = await Camera.getPhoto({
          quality: 50,
          allowEditing: true,
          resultType: CameraResultType.Base64,
          source: CameraSource.Prompt,
          width: 400,
          height: 400,
        });
        if (!image.base64String) return;
        setUploading(true);
        const byteCharacters = atob(image.base64String);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        file = new File([byteArray], `avatar_${Date.now()}.jpg`, { type: "image/jpeg" });
      } catch (err) {
        console.error("Camera error:", err);
        setUploading(false);
        return;
      }
    } else {
      file = e?.target.files?.[0];
      if (!file) return;
      setUploading(true);
    }

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

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        avatar_url: publicUrl,
      });

      if (profileError) throw profileError;

      toast.success(t('editProfile.avatarUpdated'));
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      toast.error(t('editProfile.error') + (err.message || "Erreur inconnue"));
    }

    setUploading(false);
  };

  // ---------------- SAVE PROFILE ----------------
  const handleSave = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expirée. Reconnectez-vous.");
        return;
      }

      if (!pseudo.trim()) {
        toast.error("Le pseudo est obligatoire.");
        return;
      }

      setLoading(true);

      const updates: Record<string, any> = { id: user.id };
      updates.pseudo = pseudo.trim();
      if (ville) updates.ville = ville;
      if (adresse) updates.adresse = adresse;
      if (avatarUrl) updates.avatar_url = avatarUrl;
      updates.bio = bio;
      updates.skills = skills;

      const { data, error } = await supabase.from("profiles").upsert(updates).select();

      setLoading(false);

      if (error) {
        console.error("Profile save error:", error);
        toast.error("Erreur: " + error.message);
        return;
      }

      toast.success(t('editProfile.profileUpdated'));
      navigate("/settings");
    } catch (err: any) {
      setLoading(false);
      console.error("Profile save exception:", err);
      toast.error("Erreur: " + (err.message || "Erreur inconnue"));
    }
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

          <h1 className="text-lg font-bold text-foreground">{t('editProfile.title')}</h1>

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
              onClick={() => {
                if (Capacitor.isNativePlatform()) {
                  uploadAvatar();
                } else {
                  fileRef.current?.click();
                }
              }}
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
          <p className="text-sm text-muted-foreground">{avis.length} {t('editProfile.reviews')}</p>
        </div>

        {/* PSEUDO */}
        <div>
          <label className="text-sm font-semibold mb-2 block text-foreground">{t('editProfile.pseudo')}</label>
          <Input
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            className="h-12 rounded-2xl bg-secondary border-none text-foreground"
            maxLength={30}
            placeholder={t('editProfile.pseudoPlaceholder')}
          />
          <p className="text-[11px] text-muted-foreground mt-1 text-right">{pseudo.length}/30</p>
        </div>

        {/* VILLE */}
        <div>
          <label className="text-sm font-semibold mb-2 block text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            {t('editProfile.city')}
          </label>
          <Input
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            className="h-12 rounded-2xl bg-secondary border-none text-foreground"
            placeholder={t('editProfile.cityPlaceholder')}
          />
        </div>

        {/* ADRESSE */}
        <div>
          <label className="text-sm font-semibold mb-2 block text-foreground flex items-center gap-2">
            <Home className="w-4 h-4 text-primary" />
            {t('editProfile.address')}
          </label>
          <Input
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            className="h-12 rounded-2xl bg-secondary border-none text-foreground"
            placeholder={t('editProfile.addressPlaceholder')}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {t('editProfile.addressHelper')}
          </p>
        </div>

        {/* SKILLS */}
        <div>
          <label className="text-sm font-semibold mb-2 block text-foreground">{t('editProfile.skills')}</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {skills.map((skill, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {skill}
                <button onClick={() => setSkills(skills.filter((_, idx) => idx !== i))} className="ml-0.5 hover:text-destructive">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
          <Input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && skillInput.trim()) {
                e.preventDefault();
                if (!skills.includes(skillInput.trim())) {
                  setSkills([...skills, skillInput.trim()]);
                }
                setSkillInput("");
              }
            }}
            className="h-12 rounded-2xl bg-secondary border-none text-foreground"
            placeholder={t('editProfile.skillsPlaceholder')}
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {predefinedSkills.filter(s => !skills.includes(s)).map((skill) => (
              <button
                key={skill}
                onClick={() => setSkills([...skills, skill])}
                className="px-3 py-1.5 rounded-full border border-border text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                + {skill}
              </button>
            ))}
          </div>
        </div>

        {/* SAVE BUTTON */}
        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full h-14 rounded-2xl text-base font-bold btn-magic border-0"
        >
          {loading ? t('editProfile.saving') : t('editProfile.save')}
        </Button>

        {/* AVIS */}
        <div className="space-y-3 pt-4">
          <h2 className="text-xl font-black text-foreground">{t('editProfile.reviewsTitle')}</h2>

          {avis.length === 0 && (
            <div className="rounded-2xl bg-card border border-border p-4 text-sm text-muted-foreground">
              {t('editProfile.noReviews')}
            </div>
          )}

          {avis.map((item) => (
            <div key={item.id} className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: item.note }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-foreground/90">{item.commentaire || t('editProfile.noComment')}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default EditProfile;
