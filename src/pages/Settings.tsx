import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Moon,
  Sun,
  ChevronRight,
  Shield,
  Bell,
  BellOff,
  HelpCircle,
  LogOut,
  Star,
  CreditCard,
  Wallet,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const defaultNotifPrefs = { messages: true, demandes: true, missions: true };

const Settings = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  const [pseudo, setPseudo] = useState("");
  const [ville, setVille] = useState("");
  const [adresse, setAdresse] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);

  const [moyenne, setMoyenne] = useState(0);
  const [avisCount, setAvisCount] = useState(0);
  const [stripeLinked, setStripeLinked] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState(defaultNotifPrefs);

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
        if (data.notif_prefs) setNotifPrefs(data.notif_prefs);
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

  const toggleNotifPref = async (key: keyof typeof defaultNotifPrefs) => {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    setNotifSaving(true);
    await supabase.from("profiles").upsert({ id: user!.id, notif_prefs: next });
    setNotifSaving(false);
  };

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
          icon: Wallet,
          label: "Mon portefeuille",
          desc: "Solde, retrait et historique",
          action: () => navigate("/portefeuille"),
          toggle: false,
        },
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
      ],
    },
    {
      title: "Notifications",
      items: [
        {
          icon: notifPrefs.messages ? Bell : BellOff,
          label: "Messages",
          desc: notifPrefs.messages ? "Activées" : "Désactivées",
          action: () => toggleNotifPref("messages"),
          toggle: true,
          toggled: notifPrefs.messages,
        },
        {
          icon: notifPrefs.demandes ? Bell : BellOff,
          label: "Demandes",
          desc: notifPrefs.demandes ? "Activées" : "Désactivées",
          action: () => toggleNotifPref("demandes"),
          toggle: true,
          toggled: notifPrefs.demandes,
        },
        {
          icon: notifPrefs.missions ? Bell : BellOff,
          label: "Missions",
          desc: notifPrefs.missions ? "Activées" : "Désactivées",
          action: () => toggleNotifPref("missions"),
          toggle: true,
          toggled: notifPrefs.missions,
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
          toggled: theme === "dark",
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
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white dark:text-foreground text-2xl font-black bg-magic-gradient dark:bg-cyan-gradient shrink-0">
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
                      className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${
                        (item as any).toggled
                          ? "justify-end bg-cyan-400"
                          : "justify-start bg-gray-400"
                      } ${notifSaving ? "opacity-50" : ""}`}
                    >
                      <div className="w-5 h-5 bg-white rounded-full shadow-sm transition-transform" />
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
