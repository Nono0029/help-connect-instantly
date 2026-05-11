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

  const email = user?.email || "";

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
        setPseudo(
          data.pseudo ||
            user.email?.split("@")[0] ||
            ""
        );

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

      if (data) {
        setAvisCount(data.length);

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

    fetchAvis();
  }, [user]);

  // SAVE
  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .upsert({
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

    setTimeout(() => {
      setSaved(false);
    }, 2500);
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
          action: () =>
            navigate("/change-password"),
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
          icon:
            theme === "dark"
              ? Sun
              : Moon,

          label: "Mode nuit",

          desc:
            theme === "dark"
              ? "Activé"
              : "Désactivé",

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

    {/* BACKGROUND */}
    <div className="fixed inset-0 -z-10 bg-gradient-to-b from-pastel-soft via-background to-background dark:from-[#06131a] dark:via-[#071118] dark:to-[#0a2222]" />

    <div className="fixed top-[-120px] left-[-120px] w-[280px] h-[280px] bg-pastel-yellow/20 dark:bg-cyan-400/20 blur-[120px] rounded-full -z-10" />

    <div className="fixed bottom-[-120px] right-[-120px] w-[280px] h-[280px] bg-pastel-green/20 dark:bg-green-400/20 blur-[120px] rounded-full -z-10" />

    {/* HEADER */}
    <div className="h-16 min-h-16 border-b border-border backdrop-blur-xl bg-card/70 px-4 flex items-center gap-3 z-20">

      <button
        onClick={() => navigate("/")}
        className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shrink-0 shadow-card"
      >
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </button>

      <div className="flex-1">

        <p className="font-semibold text-foreground">
          Paramètres
        </p>

        <p className="text-xs text-muted-foreground">
          Gère ton compte et tes préférences
        </p>

      </div>

    </div>

    {/* PROFILE CARD */}
    <div className="px-4 pt-5">

      <div className="card-magic">

        {/* TOP */}
        <div className="flex items-center gap-4 mb-5">

          <div className="w-16 h-16 rounded-full bg-magic-gradient dark:bg-[linear-gradient(135deg,#00b4d8_0%,#00c875_100%)] flex items-center justify-center text-white text-2xl font-black shadow-magic">

            {pseudo?.[0]?.toUpperCase() || "?"}

          </div>

          <div className="flex-1">

            <h2 className="font-bold text-lg text-foreground">
              {pseudo || "Mon profil"}
            </h2>

            <p className="text-sm text-muted-foreground">
              {email}
            </p>

            {/* NOTE */}
            <div className="flex items-center gap-1 mt-1">

              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />

              <span className="text-sm font-semibold text-foreground">
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

          {/* PSEUDO */}
          <div className="relative">

            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

            <Input
              value={pseudo}
              onChange={(e) =>
                setPseudo(e.target.value)
              }
              placeholder="Pseudo"
              className="pl-10 h-12 rounded-2xl bg-background border border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* VILLE */}
          <div className="relative">

            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

            <Input
              value={ville}
              onChange={(e) =>
                setVille(e.target.value)
              }
              placeholder="Ta ville"
              className="pl-10 h-12 rounded-2xl bg-background border border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* ADRESSE */}
          <div className="relative">

            <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

            <Input
              value={adresse}
              onChange={(e) =>
                setAdresse(e.target.value)
              }
              placeholder="Adresse pour les remises"
              className="pl-10 h-12 rounded-2xl bg-background border border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            🔒 Ton adresse reste privée.
            Elle peut être envoyée dans
            le chat uniquement si tu le
            souhaites.
          </p>

          {/* SAVE BUTTON */}
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className={`w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-semibold transition-all ${
              saved
                ? "bg-green-500 text-white"
                : "btn-magic"
            }`}
          >

            {saved ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Enregistré
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />

                {saving
                  ? "Enregistrement..."
                  : "Enregistrer"}
              </>
            )}

          </button>

        </div>
      </div>
    </div>

    {/* MES DEMANDES */}
    <div className="px-4 mt-5">

      <button
        onClick={() =>
          navigate("/mes-demandes")
        }
        className="w-full flex items-center gap-4 p-4 card-magic"
      >

        <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center">

          <ShoppingBag className="w-5 h-5 text-primary dark:text-cyan-300" />

        </div>

        <div className="flex-1 text-left">

          <p className="font-semibold text-foreground">
            Mes demandes
          </p>

          <p className="text-sm text-muted-foreground">
            Voir mes annonces
          </p>

        </div>

        <ChevronRight className="w-5 h-5 text-muted-foreground" />

      </button>
    </div>

    {/* MENU */}
    <div className="px-4 mt-6 space-y-5">

      {menuSections.map((section) => (
        <div key={section.title}>

          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2 px-1">

            {section.title}

          </h3>

          <div className="card-magic overflow-hidden divide-y divide-border">

            {section.items.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/[0.03] dark:hover:bg-white/[0.02] transition"
              >

                <item.icon className="w-5 h-5 text-primary dark:text-cyan-300 shrink-0" />

                <div className="flex-1 text-left">

                  <p className="font-medium text-foreground text-sm">
                    {item.label}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {item.desc}
                  </p>

                </div>

                {item.toggle ? (
                  <div
                    className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-all ${
                      theme === "dark"
                        ? "bg-cyan-400 justify-end"
                        : "bg-pastel-yellow justify-start"
                    }`}
                  >

                    <div className="w-5 h-5 rounded-full bg-white shadow-lg" />

                  </div>
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}

              </button>
            ))}
          </div>
        </div>
      ))}

      {/* LOGOUT */}
      <button
        onClick={handleSignOut}
        className="w-full h-12 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 font-semibold flex items-center justify-center gap-2 mt-8"
      >

        <LogOut className="w-4 h-4" />

        Se déconnecter

      </button>

    </div>
  </div>
);

export default Settings;
