import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import Index from "./pages/Index.tsx";
import Settings from "./pages/Settings.tsx";
import EditProfile from "./pages/EditProfile.tsx";
import ChangePassword from "./pages/ChangePassword.tsx";
import DemandeDetail from "./pages/DemandeDetail.tsx";
import MesDemandesPage from "./pages/MesDemandesPage.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import MessagesPage from "./pages/MessagesPage.tsx";
import ChatPage from "./pages/ChatPage.tsx";
import CreateRequestPage from "./pages/CreateRequestPage.tsx";
import PrivacyPage from "./pages/PrivacyPage.tsx";
import AidePage from "./pages/AidePage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import BecomeProPage from "./pages/BecomeProPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Index />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/edit-profile" element={<EditProfile />} />
                <Route path="/change-password" element={<ChangePassword />} />
                <Route path="/demande/:id" element={<DemandeDetail />} />
                <Route path="/mes-demandes" element={<MesDemandesPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/chat/:id" element={<ChatPage />} />
                <Route path="/create-request" element={<CreateRequestPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/aide" element={<AidePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/become-pro" element={<BecomeProPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            <BottomNav />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
