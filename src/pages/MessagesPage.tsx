import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Check, CheckCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Illu } from "@/components/Illustrations";

interface Conversation {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  read: boolean;
}

const conversations: Conversation[] = [
  { id: 1, name: "Sophie M.", avatar: "SM", lastMessage: "Super, merci beaucoup !", time: "14:32", unread: 2, read: false },
  { id: 2, name: "Marc D.", avatar: "MD", lastMessage: "D'accord, on se retrouve où ?", time: "12:15", unread: 0, read: true },
  { id: 3, name: "Fatima R.", avatar: "FR", lastMessage: "Je peux passer demain matin", time: "Hier", unread: 1, read: false },
  { id: 4, name: "Lucas T.", avatar: "LT", lastMessage: "Merci pour le café !", time: "Hier", unread: 0, read: true },
];

const MessagesPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate("/")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Messages</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une conversation..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-secondary border-none text-sm"
          />
        </div>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-1">
        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-20">
            <Illu name="messages" className="w-48 mx-auto mb-4 opacity-60" />
            <p className="font-medium">Aucune conversation</p>
            <p className="text-sm mt-1">Discute avec un prestataire pour démarrer</p>
          </div>
        )}
        {filtered.map((conv, i) => (
          <motion.div
            key={conv.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(`/chat/${conv.id}`)}
            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/50 transition-colors cursor-pointer active:scale-[0.98]"
          >
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                {conv.avatar}
              </div>
              {conv.unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                  {conv.unread}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-foreground truncate">{conv.name}</h3>
                <span className="text-[11px] text-muted-foreground shrink-0 ml-2">{conv.time}</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                {conv.read ? (
                  <CheckCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MessagesPage;
