import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Phone, Shield, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Illu } from "@/components/Illustrations";

interface Message {
  id: number;
  text: string;
  from: "me" | "them";
  time: string;
}

const mockMessages: Message[] = [
  { id: 1, text: "Salut ! Ta demande m'intéresse, tu peux m'en dire plus ?", from: "them", time: "14:32" },
  { id: 2, text: "Oui bien sûr ! J'ai besoin d'aide pour descendre un canapé du 4ème étage.", from: "me", time: "14:33" },
  { id: 3, text: "Pas de souci, je suis disponible ce weekend. Il y a un ascenseur ?", from: "them", time: "14:34" },
  { id: 4, text: "Non malheureusement, c'est par l'escalier. Mais je donne un coup de main aussi.", from: "me", time: "14:35" },
  { id: 5, text: "Ça marche ! On se retrouve samedi à 10h ?", from: "them", time: "14:36" },
  { id: 6, text: "Parfait pour moi !", from: "me", time: "14:37" },
];

const ChatPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [messages] = useState<Message[]>(mockMessages);

  const sendMessage = () => {
    if (!message.trim()) return;
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/messages")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
              SM
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Sophie M.</h2>
              <p className="text-[11px] text-green-500">En ligne</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Phone className="w-4 h-4" />
            </button>
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Shield className="w-4 h-4" />
            </button>
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-20">
            <Illu name="chat" className="w-48 mx-auto mb-4 opacity-60" />
            <p className="font-medium">Aucun message</p>
            <p className="text-sm mt-1">Envoie le premier message pour démarrer</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
              msg.from === "me"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-secondary text-foreground rounded-bl-md"
            }`}>
              <p>{msg.text}</p>
              <p className={`text-[10px] mt-1 ${msg.from === "me" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {msg.time}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="border-t border-border bg-background px-4 py-3 flex items-center gap-2">
        <Input
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Écris ton message..."
          className="flex-1 h-11 rounded-full bg-secondary border-none text-sm"
        />
        <Button size="icon" className="rounded-full h-11 w-11 shrink-0" onClick={sendMessage}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatPage;
