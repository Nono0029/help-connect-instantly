import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Sparkles, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Illu } from "@/components/Illustrations";

const AuthPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError("Remplis tous les champs."); return; }
    if (tab === "signup" && password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    if (password.length < 6) { setError("Le mot de passe doit faire au moins 6 caractères."); return; }

    setLoading(true);
    const { error: err } = tab === "signup"
      ? await signUp(email, password)
      : await signIn(email, password);
    setLoading(false);

    if (err) {
      if (err.includes("already registered")) setError("Cet email est déjà utilisé.");
      else if (err.includes("Invalid login")) setError("Email ou mot de passe incorrect.");
      else if (err.includes("Email not confirmed")) setError("Vérifie ta boîte mail pour confirmer ton compte.");
      else setError(err);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Illu name="auth" className="w-48 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">
            Deman<span className="text-primary">dé</span>
          </h1>
          <p className="text-sm text-muted-foreground">L'aide autour de toi, en quelques secondes</p>
        </div>

        <div className="bg-secondary rounded-2xl p-1 flex mb-6">
          {(["login", "signup"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(""); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "login" ? "Connexion" : "Inscription"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: tab === "login" ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 h-12 rounded-xl bg-secondary border-none" autoComplete="email" />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type={showPass ? "text" : "password"} placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10 h-12 rounded-xl bg-secondary border-none" autoComplete={tab === "signup" ? "new-password" : "current-password"} />
              <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {tab === "signup" && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="password" placeholder="Confirmer le mot de passe" value={confirm} onChange={e => setConfirm(e.target.value)} className="pl-10 h-12 rounded-xl bg-secondary border-none" autoComplete="new-password" />
              </div>
            )}

            {error && (
              <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2.5">
                {error}
              </motion.p>
            )}

            <Button onClick={handleSubmit} disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25 mt-2">
              <Sparkles className="w-4 h-4 mr-2" />
              {loading
                ? (tab === "login" ? "Connexion..." : "Inscription...")
                : (tab === "login" ? "Se connecter" : "Créer mon compte")}
            </Button>
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-xs text-muted-foreground mt-6">
          En continuant, tu acceptes les conditions d'utilisation.
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;