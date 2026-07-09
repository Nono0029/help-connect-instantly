import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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
const PaymentSetup = lazy(() => import("./pages/PaymentSetup"));
const CreateRequestPage = lazy(() => import("./pages/CreateRequestPage"));
const AidePage = lazy(() => import("./pages/AidePage"));
const BecomeProPage = lazy(() => import("./pages/BecomeProPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const MonPortefeuille = lazy(() => import("./pages/MonPortefeuille"));
const BoostProfilePage = lazy(() => import("./pages/BoostProfilePage"));

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
      <Route path="/payment-setup" element={<PaymentSetup />} />
      <Route path="/portefeuille" element={<MonPortefeuille />} />
      <Route path="/create-request" element={<CreateRequestPage />} />
      <Route path="/aide" element={<AidePage />} />
      <Route path="/become-pro" element={<BecomeProPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/boost-profile" element={<BoostProfilePage />} />
    </Route>

    {/* 404 */}
    <Route path="*" element={<NotFound />} />

    </Routes>
  );
}

/** Liquid-glass background orbs — rendered once, global to all pages */
function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* Top-left — vert */}
      <div
        className="bg-orb w-[480px] h-[480px] bg-primary/25"
        style={{ top: "-120px", left: "-120px", animationDuration: "11s" }}
      />
      {/* Mid-right — jaune */}
      <div
        className="bg-orb w-[360px] h-[360px] bg-accent/20"
        style={{ top: "35%", right: "-80px", animationDuration: "14s", animationDelay: "4s" }}
      />
      {/* Bottom-center — vert doux */}
      <div
        className="bg-orb w-[320px] h-[320px] bg-primary/15"
        style={{ bottom: "-80px", left: "25%", animationDuration: "12s", animationDelay: "8s" }}
      />
    </div>
  );
}

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
                <BackgroundOrbs />
                <ErrorBoundary>
                  <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
                    <AnimatedRoutes />
                  </Suspense>
                </ErrorBoundary>
                <BottomNav />
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
