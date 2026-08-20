import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Sparkles, Mail, Lock, MapPin, Home, Gift, CheckCircle2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { signupSchema, authSchema } from "@/lib/validations";
import { Illu } from "@/components/Illustrations";
import { useTranslation } from "@/context/LanguageContext";

const PENDING_REF_KEY = "askoo_pending_ref_code";

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
  const [refCodeInput, setRefCodeInput] = useState(
    () => new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase() || ""
  );
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showVerifyEmail, setShowVerifyEmail] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (tab === "signup" && !acceptedTerms) {
      setError(t('auth.acceptTermsError'));
      return;
    }

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
    const { error: err, requiresEmailConfirm } = tab === "signup"
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

    // Inscription : la confirmation email est requise → on le dit
    // clairement, on garde le code de parrainage en attente pour
    // l'appliquer à la première connexion, on ne crée pas le profil
    // (pas encore de session).
    if (tab === "signup" && requiresEmailConfirm) {
      if (refCodeInput) {
        try { localStorage.setItem(PENDING_REF_KEY, refCodeInput); } catch {}
      }
      setShowVerifyEmail(true);
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
        if (refCodeInput) {
          await supabase.functions.invoke("apply-referral", {
            body: { code: refCodeInput },
          });
        }
      }
    }

    navigate("/");
  };

  if (showVerifyEmail) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center px-5 py-8 relative overflow-x-hidden overflow-y-auto">
        <div className="w-full max-w-sm m-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                <Inbox className="w-9 h-9 text-accent" />
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2">
                {t('auth.verifyTitle')}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('auth.verifyDesc', { email })}
              </p>
            </div>

            <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 mb-6 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
              <p className="text-xs text-foreground font-medium">
                {t('auth.verifyReferralNotice')}
              </p>
            </div>

            <Button
              onClick={() => { setShowVerifyEmail(false); setTab("login"); }}
              className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25"
            >
              {t('auth.verifyGoLogin')}
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-5 py-8 relative overflow-x-hidden overflow-y-auto">

      <div className="w-full max-w-sm m-auto">
      {/* Illustration */}
      <div className="mb-2 flex justify-center">
        <Illu name="auth" className="w-56 h-44 sm:w-72 sm:h-56" />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full">
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
            {tab === "signup" && refCodeInput && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 rounded-xl bg-accent/10 border border-accent/20 px-4 py-3"
              >
                <Gift className="w-4 h-4 text-accent shrink-0" />
                <p className="text-xs text-foreground font-medium">
                  {t('auth.refBanner')}
                </p>
              </motion.div>
            )}
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

                <div className="relative">
                  <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t('auth.refCode')}
                    value={refCodeInput}
                    onChange={e => setRefCodeInput(e.target.value.trim().toUpperCase().slice(0, 10))}
                    className="pl-10 h-12 rounded-xl bg-secondary border-none"
                    autoCapitalize="characters"
                  />
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

            {tab === "signup" && (
              <label className="flex items-start gap-3 cursor-pointer px-1">
                <Checkbox
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {t('auth.acceptTerms')}{" "}
                  <span
                    className="text-primary underline cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); window.open("https://askoo.fr/conditions", "_system"); }}
                  >
                    {t('auth.termsLink')}
                  </span>
                  {" "}{t('auth.and')}{" "}
                  <span
                    className="text-primary underline cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); window.open("https://askoo.fr/privacy", "_system"); }}
                  >
                    {t('auth.privacyLink')}
                  </span>
                </span>
              </label>
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
          <span
            className="underline cursor-pointer"
            onClick={() => window.open("https://askoo.fr/conditions", "_system")}
          >
            {t('auth.footer')}
          </span>
        </p>
      </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;
