import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const Index = lazy(() => import("./pages/Index"));
const Settings = lazy(() => import("./pages/Settings"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const DemandeDetail = lazy(() => import("./pages/DemandeDetail"));
const MesDemandesPage = lazy(() => import("./pages/MesDemandesPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const CreateRequestPage = lazy(() => import("./pages/CreateRequestPage"));
const AidePage = lazy(() => import("./pages/AidePage"));
const BecomeProPage = lazy(() => import("./pages/BecomeProPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const MonPortefeuille = lazy(() => import("./pages/MonPortefeuille"));
const BoostProfilePage = lazy(() => import("./pages/BoostProfilePage"));
const AdminReportsPage = lazy(() => import("./pages/AdminReportsPage"));
const InvitePage = lazy(() => import("./pages/InvitePage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

function AnimatedRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  // Vague 2 — deep links du widget / Live Activity (askoo://chat/<id>, askoo://feed)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handler = ({ url }: { url: string }) => {
      const match = url.match(/^askoo:\/\/(chat|feed)(?:\/(\d+))?/);
      if (!match) return;
      if (match[1] === "chat" && match[2]) {
        navigate(`/chat/${match[2]}`);
      } else {
        navigate("/");
      }
    };
    const listener = CapacitorApp.addListener("appUrlOpen", handler);
    CapacitorApp.getLaunchUrl().then(launch => { if (launch?.url) handler({ url: launch.url }); });
    return () => { listener.then(l => l.remove()); };
  }, [navigate]);

  return (
    <Routes location={location}>

    {/* Public */}
    <Route path="/auth" element={<AuthPage />} />

    {/* Protected routes */}
    <Route element={<ProtectedRoute />}>
      <Route path="/" element={<Index />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/edit-profile" element={<EditProfile />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/demande/:id" element={<DemandeDetail />} />
      <Route path="/mes-demandes" element={<MesDemandesPage />} />

      <Route path="/messages" element={<MessagesPage />} />
      <Route path="/chat/:id" element={<ChatPage />} />
      <Route path="/profile/:id" element={<ProfilePage />} />
      <Route path="/portefeuille" element={<MonPortefeuille />} />
      <Route path="/create-request" element={<CreateRequestPage />} />
      <Route path="/aide" element={<AidePage />} />
      <Route path="/become-pro" element={<BecomeProPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/boost-profile" element={<BoostProfilePage />} />
      <Route path="/inviter" element={<InvitePage />} />
      <Route path="/admin/reports" element={<AdminReportsPage />} />
    </Route>

    {/* 404 */}
    <Route path="*" element={<NotFound />} />

    </Routes>
  );
}

/** Removed animated background orbs — they caused GPU memory pressure on iOS WebView */

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <ErrorBoundary>
                  <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
                    <AnimatedRoutes />
                  </Suspense>
                  <BottomNav />
                </ErrorBoundary>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
