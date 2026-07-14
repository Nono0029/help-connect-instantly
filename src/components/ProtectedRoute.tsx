import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const ProtectedRoute = () => {
  const { user, loading, isBlocked, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (user && isBlocked) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="text-4xl">🚫</div>
        <h1 className="text-lg font-bold text-foreground">Compte suspendu</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Ton compte a été suspendu suite à plusieurs signalements confirmés. Si tu penses qu'il s'agit d'une erreur, contacte le support.
        </p>
        <button
          onClick={() => signOut()}
          className="mt-2 h-11 px-6 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 font-semibold text-sm"
        >
          Se déconnecter
        </button>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/auth" replace />;
};

export default ProtectedRoute;
