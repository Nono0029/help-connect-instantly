import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Cookie, FileText, Scale } from "lucide-react";
import { Illu } from "@/components/Illustrations";

const sections = [
  {
    icon: FileText,
    title: "RGPD & Données personnelles",
    content: "Conformément au Règlement Général sur la Protection des Données (RGPD), tu disposes d'un droit d'accès, de rectification et de suppression de tes données personnelles. Les informations que tu partages (nom, email, localisation) sont utilisées uniquement pour le fonctionnement de la plateforme : mise en relation, messagerie et paiements. Nous ne revendons aucune donnée à des tiers. Tu peux demander la suppression de ton compte et de toutes tes données à tout moment depuis les paramètres.",
  },
  {
    icon: Scale,
    title: "Conditions Générales d'Utilisation",
    content: "En utilisant Askoo, tu acceptes de respecter les présentes conditions. La plateforme sert d'intermédiaire de mise en relation entre les demandeurs et les prestataires de services. Chaque utilisateur est responsable de ses annonces et de ses prestations. Les litiges entre membres doivent être résolus à l'amiable dans un premier temps. L'équipe d'Askoo se réserve le droit de suspendre tout compte en cas de non-respect des règles.",
  },
  {
    icon: Cookie,
    title: "Gestion des cookies",
    content: "Nous utilisons des cookies essentiels au fonctionnement de la plateforme (authentification, session utilisateur). Des cookies analytiques (anonymisés) nous aident à améliorer l'expérience. Tu peux configurer tes préférences de cookies à tout moment via les paramètres de ton navigateur. Aucun cookie publicitaire n'est utilisé sur Askoo.",
  },
  {
    icon: FileText,
    title: "Mentions légales",
    content: "Askoo est une plateforme de mise en relation entre particuliers pour des services de proximité. Éditée par la société Askoo SAS, 123 Rue de l'Entraide, 75011 Paris. SIRET : 123 456 789 00012. Directeur de la publication : L'équipe Askoo. Hébergement : Supabase Inc., 111 Sutter Street, San Francisco, CA 94104.",
  },
];

const PrivacyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/settings")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Confidentialité & Légal</h1>
        </div>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-4">
        <div className="flex justify-center mb-2">
          <Illu name="aide" className="w-40" />
        </div>

        {sections.map((section, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <section.icon className="w-4 h-4" />
              </div>
              <h2 className="font-semibold text-foreground text-sm">{section.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
          </div>
        ))}

        <p className="text-center text-xs text-muted-foreground pt-2">
          Dernière mise à jour : Mai 2026
        </p>
      </div>
    </div>
  );
};

export default PrivacyPage;
