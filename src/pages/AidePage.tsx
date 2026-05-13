import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, MessageCircle, CreditCard, UserCheck, Shield, AlertTriangle, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Illu } from "@/components/Illustrations";

const faqs = [
  {
    icon: HelpCircle,
    question: "Comment puis-je demander de l'aide ?",
    answer: "Rends-toi sur la page d'accueil et appuie sur le bouton + en bas à droite. Remplis le formulaire avec le titre, la description et la catégorie de ta demande. Tu peux aussi ajouter des photos et fixer un prix. Une fois publiée, ta demande sera visible par les prestataires autour de toi.",
  },
  {
    icon: MessageCircle,
    question: "Comment discuter avec un prestataire ?",
    answer: "Quand un prestataire est intéressé par ta demande, tu peux cliquer sur le bouton « Discuter » depuis le détail de la demande. La messagerie intégrée te permet d'échanger en temps réel. Après 5 messages échangés, le paiement sécurisé sera disponible.",
  },
  {
    icon: CreditCard,
    question: "Comment fonctionne le paiement sécurisé ?",
    answer: "Le paiement est bloqué sur notre plateforme tant que la mission n'est pas terminée. Une fois le service effectué, tu confirmes la fin de mission et les fonds sont versés au prestataire. Si un problème survient, notre équipe de médiation peut intervenir.",
  },
  {
    icon: UserCheck,
    question: "Comment devenir prestataire ?",
    answer: "Tu peux demander à devenir prestataire depuis les paramètres de ton compte. Remplis le formulaire avec tes compétences et ton expérience. Notre équipe validera ta demande sous 48h. Une fois approuvé, tu pourras proposer tes services aux demandeurs.",
  },
  {
    icon: Shield,
    question: "Est-ce que l'identité est vérifiée ?",
    answer: "Oui, nous proposons la vérification d'identité via une pièce d'identité officielle. Les membres vérifiés affichent un badge bleu. Bien que la vérification ne soit pas obligatoire, elle est fortement recommandée pour la confiance entre membres.",
  },
  {
    icon: AlertTriangle,
    question: "Que faire en cas de litige ?",
    answer: "En cas de désaccord, contacte d'abord l'autre membre via la messagerie pour trouver une solution. Si aucun accord n'est trouvé, notre équipe de support peut être sollicitée depuis la page d'aide. Nous analysons chaque situation et prenons une décision dans les 48h.",
  },
];

const AidePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/settings")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Aide & Contact</h1>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans l'aide..."
            className="pl-10 h-10 rounded-xl bg-secondary border-none text-sm"
          />
        </div>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-4">
        <div className="flex justify-center mb-2">
          <Illu name="aide" className="w-40" />
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-card rounded-2xl border border-border px-4">
              <AccordionTrigger className="py-3.5 hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <faq.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{faq.question}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="bg-card rounded-2xl border border-border p-4 text-center space-y-2">
          <p className="text-sm font-semibold text-foreground">Tu n'as pas trouvé ta réponse ?</p>
          <p className="text-xs text-muted-foreground">Contacte notre équipe de support</p>
          <button className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium mt-2">
            Nous contacter
          </button>
        </div>
      </div>
    </div>
  );
};

export default AidePage;
