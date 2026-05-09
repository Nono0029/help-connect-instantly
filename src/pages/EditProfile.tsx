import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Check, Star } from "lucide-react";
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

  const [avis, setAvis] = useState<any[]>([]);
  const [moyenne, setMoyenne] = useState(0);

  // ---------------- LOAD PROFILE ----------------
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setPseudo(data.pseudo || "");
        setBio(data.bio || "");
        setVille(data.ville || "");
      }
    };

    loadProfile();
  }, [user]);

  // ---------------- LOAD REVIEWS ----------------
  useEffect(() => {
    const loadAvis = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("avis")
        .select("*")
        .eq("cible_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setAvis(data);

        const total = data.reduce(
          (acc, item) => acc + item.note,
          0
        );

        const moyenneCalc =
          data.length > 0 ? total / data.length : 0;

        setMoyenne(moyenneCalc);
      }
    };

    loadAvis();
  }, [user]);

  // ---------------- SAVE PROFILE ----------------
  const handleSave = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        pseudo,
        bio,
        ville,
      })
      .eq("id", user.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Profil mis à jour !");
    navigate("/settings");
  };

  return (
    <div className="min-h-screen bg-background">

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">

          <button
            onClick={() => navigate("/settings")}
            className="p-1"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>

          <h1 className="text-lg font-bold text-foreground">
            Modifier le profil
          </h1>

          <button
            onClick={handleSave}
            className="p-1 text-primary"
          >
            <Check className="w-5 h-5" />
          </button>

        </div>
      </header>

      <div className="px-4 py-6 space-y-6">

        {/* AVATAR */}
        <div className="flex justify-center">
          <div className="relative">

            <div className="w-24 h-24 rounded-full bg-primary/15 text-primary flex items-center justify-center text-3xl font-bold">
              {pseudo?.[0]?.toUpperCase() || "T"}
            </div>

            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
              <Camera className="w-4 h-4" />
            </button>

          </div>
        </div>

        {/* NOTE MOYENNE */}
        <div className="bg-card border rounded-2xl p-4 text-center">
          <div className="flex justify-center items-center gap-1 mb-2">

            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />

            <p className="text-2xl font-bold">
              {moyenne.toFixed(1)}
            </p>

          </div>

          <p className="text-sm text-muted-foreground">
            {avis.length} avis reçus
          </p>
        </div>

        {/* PSEUDO */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">
            Pseudo
          </label>

          <Input
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            className="h-11 rounded-xl bg-secondary border-none"
            maxLength={30}
          />

          <p className="text-[11px] text-muted-foreground mt-1 text-right">
            {pseudo.length}/30
          </p>
        </div>

        {/* BIO */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">
            Bio
          </label>

          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="min-h-[80px] rounded-xl bg-secondary border-none resize-none"
            maxLength={200}
          />

          <p className="text-[11px] text-muted-foreground mt-1 text-right">
            {bio.length}/200
          </p>
        </div>

        {/* VILLE */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">
            Ville
          </label>

          <Input
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            className="h-11 rounded-xl bg-secondary border-none"
          />
        </div>

        {/* BOUTON */}
        <Button
          onClick={handleSave}
          className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25"
        >
          Enregistrer
        </Button>

        {/* LISTE AVIS */}
        <div className="space-y-3">

          <h2 className="text-lg font-bold">
            Avis reçus
          </h2>

          {avis.length === 0 && (
            <div className="bg-card border rounded-2xl p-4 text-sm text-muted-foreground">
              Aucun avis pour le moment
            </div>
          )}

          {avis.map((item) => (
            <div
              key={item.id}
              className="bg-card border rounded-2xl p-4"
            >

              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: item.note }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>

              <p className="text-sm text-foreground">
                {item.commentaire || "Pas de commentaire"}
              </p>

            </div>
          ))}

        </div>

      </div>
    </div>
  );
};

export default EditProfile;
