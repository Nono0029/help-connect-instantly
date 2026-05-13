import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, ShoppingBag, MessageCircle, TrendingUp, Settings, Share2 } from "lucide-react";
import { Illu } from "@/components/Illustrations";

const ProfilePage = () => {
  const navigate = useNavigate();

  const stats = [
    { label: "Demandes", value: 12, icon: ShoppingBag, color: "text-blue-500 bg-blue-500/10" },
    { label: "Propositions", value: 8, icon: TrendingUp, color: "text-green-500 bg-green-500/10" },
    { label: "Taux de réponse", value: "95%", icon: MessageCircle, color: "text-purple-500 bg-purple-500/10" },
    { label: "Avis moyen", value: "4.8", icon: Star, color: "text-yellow-500 bg-yellow-500/10" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/settings")} className="p-1">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-bold text-foreground">Mon profil</h1>
          </div>
          <button className="p-1 text-muted-foreground">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="px-4 pt-6 pb-24 space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-primary/15 text-primary flex items-center justify-center text-2xl font-bold mb-3">
            T
          </div>
          <h2 className="text-xl font-bold text-foreground">Toi</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Paris 11ème</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            J'aime aider les gens autour de moi
          </p>
          <div className="flex items-center gap-1 mt-2">
            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
            <span className="text-sm font-semibold text-foreground">4.8</span>
            <span className="text-xs text-muted-foreground">(12 avis)</span>
          </div>
          <button
            onClick={() => navigate("/edit-profile")}
            className="mt-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium"
          >
            Modifier le profil
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card rounded-2xl border border-border p-4 text-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground px-1">Activité récente</h3>
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <Illu name="empty" className="w-32 mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">Pas encore d'activité</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
