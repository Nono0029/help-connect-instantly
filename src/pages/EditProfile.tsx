import { useState, useEffect } from "react";
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

  const [avis, setAvis] = useState<any[]>([]);
  const [moyenne, setMoyenne] = useState(0);

  const [loading, setLoading] = useState(false);

  // ---------------- LOAD PROFILE ----------------
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profils")
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
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(error);
        return;
      }

      if (data) {
        setAvis(data);

        const total = data.reduce(
          (acc, item) => acc + item.note,
          0
        );

        const moyenneCalc =
          data.length > 0
            ? total / data.length
            : 0;

        setMoyenne(moyenneCalc);
      }
    };

    loadAvis();
  }, [user]);

  // ---------------- SAVE PROFILE ----------------
  const handleSave = async () => {
    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from("profils")
      .upsert({
        id: user.id,
        pseudo,
        bio,
        ville,
        adresse,
      });

    setLoading(false);

    if (error) {
      toast.error(
        "Erreur lors de la sauvegarde"
      );

      console.error(error);
      return;
    }

    toast.success(
      "Profil mis à jour 💙"
    );

    navigate("/settings");
  };

  return (
    <div className="min-h-screen bg-[#071118] text-white relative overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute top-[-100px] left-[-100px] w-[250px] h-[250px] bg-cyan-400/20 blur-[100px] rounded-full" />

      <div className="absolute bottom-[-100px] right-[-100px] w-[250px] h-[250px] bg-green-400/20 blur-[100px] rounded-full" />

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#071118]/80 backdrop-blur-2xl border-b border-white/10 px-4 py-3">

        <div className="flex items-center justify-between">

          <button
            onClick={() =>
              navigate("/settings")
            }
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <h1 className="text-lg font-bold text-white">
            Modifier le profil
          </h1>

          <button
            onClick={handleSave}
            className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg"
          >
            <Check className="w-5 h-5 text-white" />
          </button>

        </div>
      </header>

      {/* CONTENT */}
      <div className="px-4 py-6 space-y-6 relative z-10">

        {/* AVATAR */}
        <div className="flex justify-center">

          <div className="relative">

            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-cyan-400 to-green-400 flex items-center justify-center text-4xl font-black text-white shadow-2xl">
              {pseudo?.[0]?.toUpperCase() ||
                "T"}
            </div>

            <button className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
              <Camera className="w-4 h-4" />
            </button>

          </div>
        </div>

        {/* NOTE */}
        <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 text-center">

          <div className="flex justify-center items-center gap-2 mb-2">

            <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />

            <p className="text-3xl font-black">
              {moyenne.toFixed(1)}
            </p>

          </div>

          <p className="text-sm text-cyan-100/70">
            {avis.length} avis reçus
          </p>

        </div>

        {/* PSEUDO */}
        <div>

          <label className="text-sm font-semibold mb-2 block text-white">
            Pseudo
          </label>

          <Input
            value={pseudo}
            onChange={(e) =>
              setPseudo(e.target.value)
            }
            className="h-12 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400"
            maxLength={30}
            placeholder="Ton pseudo"
          />

          <p className="text-[11px] text-cyan-100/50 mt-1 text-right">
            {pseudo.length}/30
          </p>

        </div>

        {/* BIO */}
        <div>

          <label className="text-sm font-semibold mb-2 block text-white">
            Bio
          </label>

          <Textarea
            value={bio}
            onChange={(e) =>
              setBio(e.target.value)
            }
            className="min-h-[100px] rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 resize-none"
            maxLength={200}
            placeholder="Parle un peu de toi 🌱"
          />

          <p className="text-[11px] text-cyan-100/50 mt-1 text-right">
            {bio.length}/200
          </p>

        </div>

        {/* VILLE */}
        <div>

          <label className="text-sm font-semibold mb-2 block text-white flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Ville
          </label>

          <Input
            value={ville}
            onChange={(e) =>
              setVille(e.target.value)
            }
            className="h-12 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400"
            placeholder="Paris..."
          />

        </div>

        {/* ADRESSE */}
        <div>

          <label className="text-sm font-semibold mb-2 block text-white flex items-center gap-2">
            <Home className="w-4 h-4" />
            Adresse
          </label>

          <Input
            value={adresse}
            onChange={(e) =>
              setAdresse(e.target.value)
            }
            className="h-12 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400"
            placeholder="12 rue..."
          />

          <p className="text-xs text-cyan-100/50 mt-2">
            Cette adresse pourra être envoyée automatiquement dans les discussions 💙
          </p>

        </div>

        {/* SAVE BUTTON */}
        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full h-14 rounded-2xl text-base font-bold bg-gradient-to-r from-cyan-400 to-green-400 text-white shadow-2xl border-0"
        >
          {loading
            ? "Sauvegarde..."
            : "Enregistrer"}
        </Button>

        {/* AVIS */}
        <div className="space-y-3 pt-4">

          <h2 className="text-xl font-black text-white">
            Avis reçus ⭐
          </h2>

          {avis.length === 0 && (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-cyan-100/60">
              Aucun avis pour le moment
            </div>
          )}

          {avis.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-4"
            >

              <div className="flex items-center gap-1 mb-3">

                {Array.from({
                  length: item.note,
                }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-yellow-400 text-yellow-400"
                  />
                ))}

              </div>

              <p className="text-sm text-white/90">
                {item.commentaire ||
                  "Pas de commentaire"}
              </p>

            </div>
          ))}

        </div>

      </div>
    </div>
  );
};

export default EditProfile;
