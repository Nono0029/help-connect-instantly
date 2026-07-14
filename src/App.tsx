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
const AdminReportsPage = lazy(() => import("./pages/AdminReportsPage"));

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
      <Route path="/admin/reports" element={<AdminReportsPage />} />
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
      {/* Top-left — vert émeraude principal */}
      <div
        className="bg-orb w-[560px] h-[560px]"
        style={{ top: "-150px", left: "-130px", animationDuration: "11s", background: "radial-gradient(circle, rgba(34,197,94,0.32) 0%, rgba(16,185,129,0.18) 50%, transparent 70%)" }}
      />
      {/* Top-right — jaune doré */}
      <div
        className="bg-orb w-[400px] h-[400px]"
        style={{ top: "-80px", right: "-100px", animationDuration: "14s", animationDelay: "3s", background: "radial-gradient(circle, rgba(250,204,21,0.28) 0%, rgba(253,230,138,0.16) 50%, transparent 70%)" }}
      />
      {/* Mid-right — vert lime */}
      <div
        className="bg-orb w-[380px] h-[380px]"
        style={{ top: "38%", right: "-90px", animationDuration: "13s", animationDelay: "6s", background: "radial-gradient(circle, rgba(163,230,53,0.22) 0%, rgba(132,204,22,0.12) 50%, transparent 70%)" }}
      />
      {/* Center — halo doux vert */}
      <div
        className="bg-orb w-[500px] h-[500px]"
        style={{ top: "30%", left: "50%", transform: "translateX(-50%)", animationDuration: "16s", animationDelay: "2s", background: "radial-gradient(circle, rgba(34,197,94,0.10) 0%, rgba(74,222,128,0.06) 50%, transparent 70%)" }}
      />
      {/* Bottom-left — jaune/citron */}
      <div
        className="bg-orb w-[420px] h-[420px]"
        style={{ bottom: "-100px", left: "-80px", animationDuration: "12s", animationDelay: "5s", background: "radial-gradient(circle, rgba(253,224,71,0.24) 0%, rgba(250,204,21,0.14) 50%, transparent 70%)" }}
      />
      {/* Bottom-right — vert menthe */}
      <div
        className="bg-orb w-[340px] h-[340px]"
        style={{ bottom: "-60px", right: "-60px", animationDuration: "15s", animationDelay: "9s", background: "radial-gradient(circle, rgba(52,211,153,0.26) 0%, rgba(16,185,129,0.14) 50%, transparent 70%)" }}
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
