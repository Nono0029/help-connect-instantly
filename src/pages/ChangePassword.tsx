import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/context/LanguageContext";

const ChangePassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (newPass.length < 6) { toast.error(t('changePassword.minLength')); return; }
    if (newPass !== confirm) { toast.error(t('changePassword.noMatch')); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('changePassword.success'));
    navigate("/settings");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/settings")} className="p-1"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
          <h1 className="text-lg font-bold text-foreground">{t('changePassword.title')}</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-5">
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t('changePassword.newPassword')}</label>
          <div className="relative">
            <Input
              type={showNew ? "text" : "password"}
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              className="h-11 rounded-xl bg-secondary border-none pr-10"
              placeholder={t('changePassword.newPlaceholder')}
            />
            <button onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t('changePassword.confirm')}</label>
          <Input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="h-11 rounded-xl bg-secondary border-none"
            placeholder={t('changePassword.confirmPlaceholder')}
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={!newPass || !confirm || loading}
          className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25"
        >
          {loading ? t('changePassword.saving') : t('changePassword.saveBtn')}
        </Button>
      </div>
    </div>
  );
};

export default ChangePassword;
