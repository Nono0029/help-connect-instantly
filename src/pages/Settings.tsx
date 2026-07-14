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
  Rocket,
  User,
  Flag,
} from "lucide-react";
import { motion } from "framer-motion";

import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/context/LanguageContext";

const defaultNotifPrefs = { messages: true, demandes: true, missions: true };

const Settings = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut, isAdmin } = useAuth();
  const { t, language, setLanguage } = useTranslation();

  const [pseudo, setPseudo] = useState("");
  const [ville, setVille] = useState("");
  const [adresse, setAdresse] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);

  const [moyenne, setMoyenne] = useState(0);
  const [avisCount, setAvisCount] = useState(0);
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
        setAvatarUrl(data.avatar_url || "");
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
      toast.error(t('settings.saveError'));
      console.error(error);
      return;
    }

    toast.success(t('settings.saveSuccess'));
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
      title: t('settings.sectionAccount'),
      items: [
        {
          icon: User,
          label: t('settings.viewProfile'),
          desc: t('settings.viewProfileDesc'),
          action: () => user && navigate(`/profile/${user.id}`),
          toggle: false,
        },
        {
          icon: Wallet,
          label: t('settings.wallet'),
          desc: t('settings.walletDesc'),
          action: () => navigate("/portefeuille"),
          toggle: false,
        },
        {
          icon: Shield,
          label: t('settings.security'),
          desc: t('settings.securityDesc'),
          action: () => navigate("/change-password"),
          toggle: false,
        },
        {
          icon: CreditCard,
          label: t('settings.stripePayments'),
          desc: t('settings.stripeDesc'),
          action: () => navigate("/payment-setup"),
          toggle: false,
        },
        {
          icon: Rocket,
          label: t('settings.boost'),
          desc: t('settings.boostDesc'),
          action: () => navigate("/boost-profile"),
          toggle: false,
        },
      ],
    },
    {
      title: t('settings.sectionNotifications'),
      items: [
        {
          icon: notifPrefs.messages ? Bell : BellOff,
          label: t('settings.messages'),
          desc: notifPrefs.messages ? t('settings.enabled') : t('settings.disabled'),
          action: () => toggleNotifPref("messages"),
          toggle: true,
          toggled: notifPrefs.messages,
        },
        {
          icon: notifPrefs.demandes ? Bell : BellOff,
          label: t('settings.requests'),
          desc: notifPrefs.demandes ? t('settings.enabled') : t('settings.disabled'),
          action: () => toggleNotifPref("demandes"),
          toggle: true,
          toggled: notifPrefs.demandes,
        },
        {
          icon: notifPrefs.missions ? Bell : BellOff,
          label: t('settings.missions'),
          desc: notifPrefs.missions ? t('settings.enabled') : t('settings.disabled'),
          action: () => toggleNotifPref("missions"),
          toggle: true,
          toggled: notifPrefs.missions,
        },
      ],
    },
    {
      title: t('settings.sectionPrefs'),
      items: [
        {
          icon: theme === "dark" ? Sun : Moon,
          label: t('settings.darkMode'),
          desc: theme === "dark" ? t('settings.darkModeOn') : t('settings.darkModeOff'),
          action: toggleTheme,
          toggle: true,
          toggled: theme === "dark",
        },
      ],
    },
    {
      title: t('settings.sectionSupport'),
      items: [
        {
          icon: HelpCircle,
          label: t('settings.helpCenter'),
          desc: t('settings.helpCenterDesc'),
          action: () => navigate("/aide"),
          toggle: false,
        },
        {
          icon: Star,
          label: t('settings.rateApp'),
          desc: t('settings.rateAppDesc'),
          action: () => toast.info(t('settings.comingSoon')),
          toggle: false,
        },
      ],
    },
    ...(isAdmin ? [{
      title: "Administration",
      items: [
        {
          icon: Flag,
          label: "Signalements",
          desc: "Voir et traiter les signalements d'utilisateurs",
          action: () => navigate("/admin/reports"),
          toggle: false,
        },
      ],
    }] : []),
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
          <p className="font-semibold">{t('settings.title')}</p>
          <p className="text-xs text-muted-foreground">
            {t('settings.subtitle')}
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
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white dark:text-foreground text-2xl font-black bg-magic-gradient dark:bg-cyan-gradient shrink-0 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                pseudo?.[0]?.toUpperCase() || "?"
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg truncate">{pseudo || t('settings.myProfile')}</h2>
              <p className="text-sm text-muted-foreground truncate">{email}</p>

              <div className="flex items-center gap-1 mt-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold">
                  {moyenne.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({avisCount} {t('settings.reviews')})
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
                <motion.button
                  key={item.label}
                  onClick={item.action}
                  disabled={!item.action && !item.toggle}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center gap-4 px-4 py-4 transition-colors duration-150 hover:bg-muted/50 rounded-xl"
                >

                  <item.icon className="w-5 h-5 text-muted-foreground" />

                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>

                  {item.toggle ? (
                    <div
                      className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-all duration-200 ${
                        (item as any).toggled
                          ? "justify-end bg-primary"
                          : "justify-start bg-muted"
                      } ${notifSaving ? "opacity-50" : ""}`}
                    >
                      <motion.div
                        layout
                        className="w-5 h-5 bg-white rounded-full shadow-sm"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </div>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}

                </motion.button>
              ))}

            </div>
          </div>
        ))}

      </div>

      {/* LANGUAGE */}
      <div className="px-4 mt-5">
        <h3 className="text-xs uppercase text-muted-foreground mb-2">
          {t('settings.language')}
        </h3>
        <div className="card-magic divide-y divide-border">
          <div className="flex gap-2 p-4">
            <button
              onClick={() => setLanguage('fr')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                language === 'fr'
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t('settings.langFr')}
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                language === 'en'
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t('settings.langEn')}
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
          {t('settings.logout')}
        </button>
      </div>

    </div>
  );
};

export default Settings;
