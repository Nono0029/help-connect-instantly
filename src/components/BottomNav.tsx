import { useLocation, useNavigate } from "react-router-dom";
import { Home, ShoppingBag, MessageCircle, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/context/LanguageContext";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navItems = [
    { icon: Home, label: t('nav.home'), path: "/" },
    { icon: ShoppingBag, label: t('nav.myRequests'), path: "/mes-demandes" },
    { icon: Plus, label: t('nav.post'), path: "/create-request", highlight: true },
    { icon: MessageCircle, label: t('nav.messages'), path: "/messages" },
    { icon: Settings, label: t('nav.profile'), path: "/settings" },
  ];

  const hiddenRoutes = [
    "/auth",
    "/chat/",
    "/demande/",
    "/boost-profile",
    "/edit-profile",
    "/change-password",
    "/payment-setup",
    "/portefeuille",
    "/become-pro",
    "/privacy",
    "/aide",
    "/profile/",
  ];
  if (hiddenRoutes.some(r => location.pathname.startsWith(r))) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1.5 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = item.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.path);

          if (item.highlight) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-0.5 px-3 py-1 -mt-3"
              >
                <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30">
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[10px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
