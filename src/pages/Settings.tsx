mport { ArrowLeft, User, Moon, Sun, ChevronRight, Shield, Bell, ShoppingBag, HelpCircle, LogOut, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";

const Settings = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const pseudo = "Mon compte";
  const email = "";

  const menuSections = [
    {
      title: "Mon compte",
      items: [
        { icon: User, label: "Modifier mon profil", desc: "Pseudo, photo, bio", action: () => navigate("/edit-profile"), toggle: false },
        { icon: Shield, label: "Mot de passe & sécurité", desc: "Changer mon mot de passe", action: () => navigate("/change-password"), toggle: false },
        { icon: Bell, label: "Notifications", desc: "Gérer les alertes", action: undefined, toggle: false },
      ],
    },
    {
      title: "Préférences",
      items: [
        { icon: theme === "dark" ? Sun : Moon, label: "Mode nuit", desc: theme === "dark" ? "Activé" : "Désactivé", action: toggleTheme, toggle: true },
      ],
    },
    {
      title: "Aide",
      items: [
        { icon: HelpCircle, label: "Centre d'aide", desc: "FAQ et support", action: undefined, toggle: false },
        { icon: Star, label: "Noter l'appli", desc: "Donne-nous 5 étoiles !", action: undefined, toggle: false },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Paramètres</h1>
        </div>
      </header>

      <div className="mx-4 mt-4 p-4 bg-card rounded-2xl border border-border cursor-pointer" onClick={() => navigate("/edit-profile")}>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xl font-bold">
            {pseudo[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-foreground">{pseudo}</h2>
            <p className="text-sm text-muted-foreground">{email}</p>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className="w-3 h-3 fill-primary text-primary" />
              ))}
              <span className="text-xs text-muted-foreground ml-1">4.8 (12 avis)</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>

      <div className="mx-4 mt-4">
        <button
          onClick={() => navigate("/mes-demandes")}
          className="w-full flex items-center gap-3 p-4 bg-card rounded-2xl border border-border hover:bg-secondary/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-foreground">Mes demandes</p>
            <p className="text-sm text-muted-foreground">Voir, modifier ou supprimer mes demandes</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="px-4 mt-5 pb-8 space-y-5">
        {menuSections.map(section => (
          <div key={section.title}>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{section.title}</h3>
            <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
              {section.items.map(item => (
                <button key={item.label} onClick={item.action} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors">
                  <item.icon className="w-5 h-5 text-primary" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  {item.toggle ? (
                    <div className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-all ${theme === "dark" ? "bg-primary justify-end" : "bg-muted-foreground/20 justify-start"}`}>
                      <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                    </div>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button className="w-full flex items-center justify-center gap-2 py-3 text-destructive font-medium text-sm">
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default Settings;
