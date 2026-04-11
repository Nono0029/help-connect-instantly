import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, Heart, MessageCircle, CreditCard, Send, Shield, Star, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const demandes = [
  { id: 1, titre: "Aide déménagement canapé", description: "Besoin de 2 personnes costauds pour descendre un canapé 3 places du 4ème étage. Le canapé pèse environ 40kg, il faudra le descendre par l'escalier (pas d'ascenseur). Je fournis les sangles et les protections.", categorie: "🏠 Maison", distance: "350m", distanceKm: 0.35, temps: "Il y a 5 min", auteur: "Sophie M.", avatar: "SM", urgent: true, gratuit: false, prix: "30€", lat: 48.858, lng: 2.347, note: 4.9, avis: 23 },
  { id: 2, titre: "Garder mon chien ce weekend", description: "Golden retriever très calme, juste besoin de promenades et câlins. Il s'appelle Oscar, 4 ans, vacciné et sociable. Je fournis la nourriture et tous les accessoires.", categorie: "🐶 Animaux", distance: "800m", distanceKm: 0.8, temps: "Il y a 12 min", auteur: "Marc D.", avatar: "MD", urgent: false, gratuit: false, prix: "25€/jour", lat: 48.862, lng: 2.352, note: 4.7, avis: 15 },
  { id: 3, titre: "Réparer fuite robinet cuisine", description: "Le robinet de la cuisine goutte depuis hier, j'ai les joints mais pas les outils. C'est un mitigeur classique, la fuite vient de la base.", categorie: "🔧 Bricolage", distance: "1.2km", distanceKm: 1.2, temps: "Il y a 20 min", auteur: "Fatima R.", avatar: "FR", urgent: true, gratuit: false, prix: "40€", lat: 48.855, lng: 2.340, note: 4.5, avis: 8 },
  { id: 4, titre: "Cours de maths niveau terminale", description: "Mon fils a le bac dans 3 semaines, besoin d'un coup de pouce en maths. Chapitres : suites, probabilités et fonctions exponentielles.", categorie: "📚 Cours", distance: "2km", distanceKm: 2, temps: "Il y a 35 min", auteur: "Jean-Pierre L.", avatar: "JL", urgent: false, gratuit: false, prix: "20€/h", lat: 48.865, lng: 2.355, note: 4.8, avis: 31 },
  { id: 5, titre: "Quelqu'un pour discuter", description: "Journée difficile, j'aimerais juste parler avec quelqu'un autour d'un café. Je suis dans le quartier, on peut se retrouver au café du coin.", categorie: "💬 Écoute", distance: "500m", distanceKm: 0.5, temps: "Il y a 8 min", auteur: "Lucas T.", avatar: "LT", urgent: false, gratuit: true, lat: 48.860, lng: 2.344, note: 4.6, avis: 5 },
  { id: 6, titre: "Monter une étagère IKEA", description: "J'ai l'étagère KALLAX et tous les outils, juste besoin d'aide pour la monter. C'est le modèle 4x4 cases.", categorie: "🔧 Bricolage", distance: "1.5km", distanceKm: 1.5, temps: "Il y a 45 min", auteur: "Camille B.", avatar: "CB", urgent: false, gratuit: false, prix: "15€", lat: 48.857, lng: 2.350, note: 4.3, avis: 2 },
  { id: 7, titre: "Cherche dev React pour projet perso", description: "Besoin d'un développeur React pour 2-3h ce weekend sur une app perso. Stack: React + TypeScript + Supabase.", categorie: "💻 Tech", distance: "3km", distanceKm: 3, temps: "Il y a 1h", auteur: "Nassim K.", avatar: "NK", urgent: false, gratuit: false, prix: "50€/h", lat: 48.870, lng: 2.360, note: 5.0, avis: 18 },
  { id: 8, titre: "Arroser mes plantes cette semaine", description: "Je pars en vacances, j'ai 6 plantes à arroser 2 fois dans la semaine. Je laisse les clés à un voisin.", categorie: "🌱 Jardin", distance: "600m", distanceKm: 0.6, temps: "Il y a 15 min", auteur: "Marie C.", avatar: "MC", urgent: false, gratuit: true, lat: 48.859, lng: 2.346, note: 4.4, avis: 9 },
];

const DemandeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ text: string; from: "me" | "them"; time: string }[]>([
    { text: "Salut ! Ta demande m'intéresse, tu peux m'en dire plus ?", from: "them", time: "14:32" },
  ]);
  const [liked, setLiked] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const demande = demandes.find(d => d.id === Number(id));
  if (!demande) return <div className="p-8 text-center text-muted-foreground">Demande introuvable</div>;

  const sendMessage = () => {
    if (!message.trim()) return;
    setMessages(prev => [...prev, { text: message, from: "me", time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }]);
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
          <h1 className="text-sm font-bold text-foreground truncate mx-3 flex-1 text-center">{demande.titre}</h1>
          <div className="flex items-center gap-1">
            <button onClick={() => setLiked(!liked)} className="p-1.5">
              <Heart className={`w-5 h-5 ${liked ? "fill-accent text-accent" : "text-muted-foreground"}`} />
            </button>
            <button className="p-1.5"><Share2 className="w-5 h-5 text-muted-foreground" /></button>
          </div>
        </div>
      </header>

      {!showChat ? (
        <div className="flex-1 overflow-y-auto pb-28">
          {/* Author info */}
          <div className="px-4 pt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center text-lg font-bold">
                {demande.avatar}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-foreground">{demande.auteur}</h2>
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-3 h-3 ${s <= Math.floor(demande.note) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">{demande.note} ({demande.avis} avis)</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{demande.distance}</span>
                  <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{demande.temps}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Demand details */}
          <div className="px-4 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-2">{demande.titre}</h3>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-xs rounded-lg">{demande.categorie}</Badge>
                {demande.urgent && <Badge className="bg-destructive text-destructive-foreground text-xs rounded-lg">⚡ Urgent</Badge>}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{demande.description}</p>
            </div>

            {/* Price card */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Budget proposé</span>
                <span className={`text-xl font-bold ${demande.gratuit ? "text-accent" : "text-foreground"}`}>
                  {demande.gratuit ? "Gratuit ❤️" : demande.prix}
                </span>
              </div>
            </div>

            {/* Safety notice */}
            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Paiement sécurisé</p>
                  <p className="text-xs text-muted-foreground">Discute d'abord avec le demandeur pour convenir des détails. Le paiement par carte est sécurisé et l'argent n'est versé qu'une fois la mission validée.</p>
                </div>
              </div>
            </div>

            {/* ID verification badge */}
            <div className="bg-accent/10 rounded-2xl p-4 border border-accent/20">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Identité vérifiée ✓</p>
                  <p className="text-xs text-muted-foreground">Ce membre a vérifié son identité avec une pièce d'identité officielle pour la sécurité de tous.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Chat view */
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  msg.from === "me"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-foreground rounded-bl-md"
                }`}>
                  <p>{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${msg.from === "me" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{msg.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="border-t border-border px-4 py-3 flex items-center gap-2">
            <Input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Écris ton message..."
              className="flex-1 h-10 rounded-full bg-secondary border-none text-sm"
            />
            <Button size="icon" className="rounded-full h-10 w-10 shrink-0" onClick={sendMessage}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bottom action bar */}
      {!showChat && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t border-border px-4 py-3 z-40">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl font-semibold"
              onClick={() => setShowChat(true)}
            >
              <MessageCircle className="w-4 h-4 mr-2" /> Discuter
            </Button>
            <Button className="flex-1 h-12 rounded-xl font-semibold shadow-lg shadow-primary/25">
              <CreditCard className="w-4 h-4 mr-2" /> Payer {demande.gratuit ? "" : demande.prix}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemandeDetail;
