import { ArrowLeft, User, Moon, Sun, ChevronRight, Shield, Bell, Heart, ShoppingBag, HelpCircle, LogOut, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";

const historyItems = [
  { id: 1, titre: "Aide déménagement", type: "demande", date: "Il y a 2 jours", prix: "30€", status: "terminé" },
  { id: 2, titre: "Cours de maths", type: "offre", date: "Il y a 5 jours", prix: "20€/h", status: "en cours" },
  { id: 3, titre: "Garde de chien", type: "demande", date: "Il y a 1 semaine", prix: "25€/jour", status: "terminé" },
];

const Settings = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const menuSections = [
    {
      title: "Mon compte",
      items: [
        { icon: User, label: "Modifier mon profil", desc: "Pseudo, photo, bio", action: () => navigate("/edit-profile") },
        { icon: Shield, label: "Mot de passe & sécurité", desc: "Changer mot de passe", action: () => navigate("/change-password") },
        { icon: Bell, label: "Notifications", desc: "Gérer les alertes" },
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
        { icon: HelpCircle, label: "Centre d'aide", desc: "FAQ et support" },
        { icon: Star, label: "Noter l'appli", desc: "Donne-nous 5 étoiles !" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-1"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
          <h1 className="text-lg font-bold text-foreground">Paramètres</h1>
        </div>
      </header>

      <div className="mx-4 mt-4 p-4 bg-card rounded-2xl border border-border cursor-pointer" onClick={() => navigate("/edit-profile")}>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xl font-bold">T</div>
          <div className="flex-1">
            <h2 className="font-bold text-foreground">Toi</h2>
            <p className="text-sm text-muted-foreground">Paris 11ème · Membre depuis 2024</p>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={`w-3 h-3 ${s <= 4 ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              ))}
              <span className="text-xs text-muted-foreground ml-1">4.8 (12 avis)</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>

      <div className="mx-4 mt-5">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary" /> Historique
        </h3>
        <div className="space-y-2">
          {historyItems.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-card rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${item.type === "demande" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"}`}>
                  {item.type === "demande" ? <Heart className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.titre}</p>
                  <p className="text-xs text-muted-foreground">{item.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{item.prix}</p>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${item.status === "terminé" ? "bg-accent/15 text-accent" : "bg-primary/15 text-primary"}`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
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
                    <div className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 ${theme === "dark" ? "bg-primary justify-end" : "bg-muted-foreground/20 justify-start"}`}>
                      <div className="w-5 h-5 rounded-full bg-card shadow-sm" />
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
          <LogOut className="w-4 h-4" /> Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default Settings;
