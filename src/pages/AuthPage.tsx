import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Sparkles, Mail, Lock, MapPin, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { signupSchema, authSchema } from "@/lib/validations";
import { Illu } from "@/components/Illustrations";
import { useTranslation } from "@/context/LanguageContext";

const AuthPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { t } = useTranslation();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ville, setVille] = useState("");
  const [adresse, setAdresse] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    if (tab === "login") {
      const result = authSchema.safeParse({ email, password });
      if (!result.success) {
        setError(result.error.errors[0].message);
        return;
      }
    } else {
      const result = signupSchema.safeParse({ email, password, confirm, ville });
      if (!result.success) {
        setError(result.error.errors[0].message);
        return;
      }
    }

    setLoading(true);
    const { error: err } = tab === "signup"
      ? await signUp(email, password)
      : await signIn(email, password);
    setLoading(false);

    if (err) {
      if (err.includes("already registered")) setError(t('auth.errorExists'));
      else if (err.includes("Invalid login")) setError(t('auth.errorCredentials'));
      else if (err.includes("Email not confirmed")) setError(t('auth.errorConfirm'));
      else setError(err);
      return;
    }

    // Si inscription, créer le profil
    if (tab === "signup") {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          ville,
          adresse,
          pseudo: email.split("@")[0],
        });
      }
    }

    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 relative overflow-hidden">
      {/* Fond décoratif */}
      <div className="absolute top-[-80px] left-[-80px] w-64 h-64 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-80px] right-[-80px] w-64 h-64 bg-accent/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Illustration */}
      <div className="mb-2 flex justify-center">
        <Illu name="auth" className="w-56 h-44 sm:w-72 sm:h-56" />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">
            Ask<span className="text-primary">oo</span>
          </h1>
          <p className="text-sm text-muted-foreground">{t('auth.tagline')}</p>
        </div>

        <div className="bg-secondary rounded-2xl p-1 flex mb-6">
          {(["login", "signup"] as const).map(tabItem => (
            <button
              key={tabItem}
              onClick={() => { setTab(tabItem); setError(""); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === tabItem ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              {tabItem === "login" ? t('auth.login') : t('auth.signup')}
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
              <Input type="email" placeholder={t('auth.email')} value={email} onChange={e => setEmail(e.target.value)} className="pl-10 h-12 rounded-xl bg-secondary border-none" autoComplete="email" />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type={showPass ? "text" : "password"} placeholder={t('auth.password')} value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10 h-12 rounded-xl bg-secondary border-none" autoComplete={tab === "signup" ? "new-password" : "current-password"} />
              <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {tab === "signup" && (
              <>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" placeholder={t('auth.confirmPassword')} value={confirm} onChange={e => setConfirm(e.target.value)} className="pl-10 h-12 rounded-xl bg-secondary border-none" autoComplete="new-password" />
                </div>

                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder={t('auth.city')} value={ville} onChange={e => setVille(e.target.value)} className="pl-10 h-12 rounded-xl bg-secondary border-none" />
                </div>

                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder={t('auth.address')} value={adresse} onChange={e => setAdresse(e.target.value)} className="pl-10 h-12 rounded-xl bg-secondary border-none" />
                </div>

                <p className="text-[11px] text-muted-foreground px-1">
                  {t('auth.addressNotice')}
                </p>
              </>
            )}

            {error && (
              <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2.5">
                {error}
              </motion.p>
            )}

            <Button onClick={handleSubmit} disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25 mt-2">
              <Sparkles className="w-4 h-4 mr-2" />
              {loading
                ? (tab === "login" ? t('auth.loginLoading') : t('auth.signupLoading'))
                : (tab === "login" ? t('auth.loginBtn') : t('auth.signupBtn'))}
            </Button>
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {t('auth.footer')}
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
