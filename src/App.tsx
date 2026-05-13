import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";

import Index from "./pages/Index";
import Settings from "./pages/Settings";
import EditProfile from "./pages/EditProfile";
import ChangePassword from "./pages/ChangePassword";
import DemandeDetail from "./pages/DemandeDetail";
import MesDemandesPage from "./pages/MesDemandesPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

// ✅ AJOUT
import MessagesPage from "./pages/MessagesPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import PaymentSetup from "./pages/PaymentSetup";
import CreateRequestPage from "./pages/CreateRequestPage";
import AidePage from "./pages/AidePage";
import BecomeProPage from "./pages/BecomeProPage";
import PrivacyPage from "./pages/PrivacyPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>

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

                  {/* ✅ NOUVEAU */}
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/chat/:id" element={<ChatPage />} />
                  <Route path="/profile/:id" element={<ProfilePage />} />
                  <Route path="/payment-setup" element={<PaymentSetup />} />
                  <Route path="/create-request" element={<CreateRequestPage />} />
                  <Route path="/aide" element={<AidePage />} />
                  <Route path="/become-pro" element={<BecomeProPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                </Route>

                {/* 404 */}
                <Route path="*" element={<NotFound />} />

              </Routes>
              <BottomNav />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
