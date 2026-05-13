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
  CreditCard,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
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
  const [stripeLinked, setStripeLinked] = useState(false);

  const email = user?.email || "";

  // PROFILE
  useEffect(() => {
    const fetchProfile = async () => {
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
        setPseudo(data.pseudo || email.split("@")[0] || "");
        setVille(data.ville || "");
        setAdresse(data.adresse || "");
        setStripeLinked(data.stripe_onboarding || false);
      } else {
        const { error: insertError } = await supabase.from("profiles").upsert({
          id: user.id,
          pseudo: email.split("@")[0],
        });
        if (insertError) console.error(insertError);
        setPseudo(email.split("@")[0] || "");
      }
    };

    fetchProfile();
  }, [user]);

  // AVIS
  useEffect(() => {
    const fetchAvis = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("avis")
        .select("note")
        .eq("cible_id", user.id);

      if (!data) return;

      const total = data.reduce(
        (acc, item) => acc + (item.note || 0),
        0
      );

      const count = data.length;

      setAvisCount(count);
      setMoyenne(count ? total / count : 0);
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
      toast.error("Erreur lors de la sauvegarde");
      console.error(error);
      return;
    }

    toast.success("Profil mis à jour 💙");
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
          icon: CreditCard,
          label: "Paiements Stripe",
          desc: stripeLinked ? "✅ Compte connecté" : "Recevoir des paiements",
          action: () => navigate("/payment-setup"),
          toggle: false,
        },
        {
          icon: Bell,
          label: "Notifications",
          desc: "Bientôt disponible",
          action: () => toast.info("Bientôt disponible ✨"),
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
          action: () => navigate("/aide"),
          toggle: false,
        },
        {
          icon: Star,
          label: "Noter l'application",
          desc: "Merci pour ton soutien 💙",
          action: () => toast.info("Bientôt disponible ✨"),
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
          className="w-9 h-9 rounded-full flex items-center justify-center"
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
        <div
          className="card-magic cursor-pointer"
          onClick={() => navigate("/edit-profile")}
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black bg-magic-gradient shrink-0">
              {pseudo?.[0]?.toUpperCase() || "?"}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg truncate">{pseudo || "Mon profil"}</h2>
              <p className="text-sm text-muted-foreground truncate">{email}</p>

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

            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </div>
        </div>
      </div>

      {/* MENU */}
      <div className="px-4 mt-6 space-y-5">

        {menuSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs uppercase text-muted-foreground mb-2">
              {section.title}
            </h3>

            <div className="card-magic divide-y divide-border">

              {section.items.map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  disabled={!item.action && !item.toggle}
                  className="w-full flex items-center gap-4 px-4 py-4"
                >

                  <item.icon className="w-5 h-5" />

                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>

                  {item.toggle ? (
                    <div
                      className={`w-11 h-6 rounded-full flex items-center px-0.5 ${
                        theme === "dark"
                          ? "justify-end bg-cyan-400"
                          : "justify-start bg-yellow-300"
                      }`}
                    >
                      <div className="w-5 h-5 bg-white rounded-full" />
                    </div>
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}

                </button>
              ))}

            </div>
          </div>
        ))}

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
