import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const ChangePassword = () => {
  const navigate = useNavigate();
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (newPass.length < 6) { toast.error("Le mot de passe doit faire au moins 6 caracteres"); return; }
    if (newPass !== confirm) { toast.error("Les mots de passe ne correspondent pas"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mot de passe modifie !");
    navigate("/settings");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/settings")} className="p-1"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
          <h1 className="text-lg font-bold text-foreground">Mot de passe</h1>
        </div>
      </header>

      <div className="px-4 py-6 pb-28 space-y-5">
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Nouveau mot de passe</label>
          <div className="relative">
            <Input
              type={showNew ? "text" : "password"}
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              className="h-11 rounded-xl bg-secondary border-none pr-10"
              placeholder="Min. 6 caracteres"
            />
            <button onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Confirmer</label>
          <Input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="h-11 rounded-xl bg-secondary border-none"
            placeholder="Retape le nouveau mot de passe"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={!newPass || !confirm || loading}
          className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25"
        >
          {loading ? "Modification..." : "Modifier le mot de passe"}
        </Button>
      </div>
    </div>
  );
};

export default ChangePassword;
