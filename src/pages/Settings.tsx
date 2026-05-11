import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Moon,
  Sun,
  ChevronRight,
  Shield,
  Bell,
  ShoppingBag,
  HelpCircle,
  LogOut,
  Star,
  MapPin,
  Home,
  Save,
  User,
  CheckCircle2,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";

const Settings = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  const [pseudo, setPseudo] = useState("");
  const [ville, setVille] = useState("");
  const [adresse, setAdresse] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [moyenne, setMoyenne] = useState(0);
  const [avisCount, setAvisCount] = useState(0);

  const email = user?.email ?? "";

  // LOAD PROFILE
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setPseudo(data.pseudo || email.split("@")[0] || "");
        setVille(data.ville || "");
        setAdresse(data.adresse || "");
      }
    };

    fetchProfile();
  }, [user]);

  // LOAD AVIS
  useEffect(() => {
    const fetchAvis = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("avis")
        .select("note")
        .eq("cible_id", user.id);

      if (!data) return;

      const notes = data.map((a) => a.note ?? 0);

      const total = notes.reduce((acc, n) => acc + n, 0);

      setAvisCount(notes.length);
      setMoyenne(notes.length ? total / notes.length : 0);
    };

    fetchAvis();
  }, [user]);

  // SAVE
  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      pseudo,
      ville,
      adresse,
    });

    setSaving(false);

    if (error) {
      console.error(error);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // LOGOUT
  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const menuSections = [
    {
      title: "Compte",
      items: [
        {
          icon: Shield,
          label: "Sécurité",
          desc: "Mot de passe et sécurité",
          action: () => navigate("/change-password"),
          toggle: false,
        },
        {
          icon: Bell,
          label: "Notifications",
          desc: "Bientôt disponible",
          action: undefined,
          toggle: false,
        },
      ],
    },
    {
      title: "Préférences",
      items: [
        {
          icon: theme === "dark" ? Sun : Moon,
          label: "Mode nuit",
          desc: theme === "dark" ? "Activé" : "Désactivé",
          action: toggleTheme,
          toggle: true,
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          icon: HelpCircle,
          label: "Centre d'aide",
          desc: "FAQ et assistance",
          action: undefined,
          toggle: false,
        },
        {
          icon: Star,
          label: "Noter l'application",
          desc: "Merci pour ton soutien 💙",
          action: undefined,
          toggle: false,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 transition-colors duration-300">

      {/* HEADER */}
      <div className="h-16 border-b border-border bg-card/70 px-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-full border flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <p className="font-semibold">Paramètres</p>
          <p className="text-xs text-muted-foreground">
            Gère ton compte et tes préférences
          </p>
        </div>
      </div>

      {/* PROFILE */}
      <div className="px-4 pt-5">
        <div className="card-magic">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full bg-magic-gradient flex items-center justify-center text-white text-2xl font-bold">
              {pseudo?.[0]?.toUpperCase() || "?"}
            </div>

            <div className="flex-1">
              <h2 className="font-bold text-lg">{pseudo || "Mon profil"}</h2>
              <p className="text-sm text-muted-foreground">{email}</p>

              <div className="flex items-center gap-1 mt-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold">
                  {moyenne.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({avisCount} avis)
                </span>
              </div>
            </div>
          </div>

          {/* FORM */}
          <div className="space-y-4">

            <Input value={pseudo} onChange={(e) => setPseudo(e.target.value)} placeholder="Pseudo" />
            <Input value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Ville" />
            <Input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Adresse" />

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full h-12 rounded-2xl btn-magic"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Enregistré
                </>
              ) : saving ? (
                "Enregistrement..."
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* LOGOUT */}
      <div className="px-4 mt-8">
        <button
          onClick={handleSignOut}
          className="w-full h-12 rounded-2xl border border-red-500/20 text-red-400 flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>

    </div>
  );
};

export default Settings;
