import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Send, MapPin, CreditCard, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface Message {
  id: number;
  conversation_id: number;
  sender_id: string;
  content: string;
  created_at: string;
  is_auto?: boolean;
}

interface Conversation {
  id: number;
  demande_id: number;
  helper_id: string;
  demandeur_id: string;
  statut: string;
  demande?: { titre: string; prix?: string; gratuit?: boolean; user_id?: string };
}

const ChatPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [showAddressPrompt, setShowAddressPrompt] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", parseInt(id))
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  useEffect(() => {
    if (!id || !user) return;

    const fetchConv = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*, demande:demande_id(titre, prix, gratuit, user_id)")
        .eq("id", id)
        .single();
      if (data) setConversation(data);
    };

    const fetchAddress = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("adresse")
        .eq("id", user.id)
        .single();
      if (data?.adresse) setUserAddress(data.adresse);
    };

    fetchConv();
    fetchMessages();
    fetchAddress();

    const channel = supabase
      .channel(`chat-${id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${parseInt(id!)}`,
      }, async () => {
        await fetchMessages();
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "conversations",
        filter: `id=eq.${id}`,
      }, (payload) => {
        setConversation(prev => prev ? { ...prev, statut: payload.new.statut } : prev);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  useEffect(() => {
    if (searchParams.get("success") === "true" && conversation?.statut === "payé") {
      if (user?.id === conversation.demandeur_id && userAddress) {
        setShowAddressPrompt(true);
      }
    }
  }, [conversation, searchParams, user, userAddress]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content: string, isAuto = false) => {
    if (!content.trim() || !user || !id) return;
    setLoading(true);
    await supabase.from("messages").insert([{
      conversation_id: parseInt(id),
      sender_id: user.id,
      content,
      is_auto: isAuto,
    }]);
    await fetchMessages();
    setText("");
    setLoading(false);
  };

  const handlePay = async () => {
    if (!conversation) return;
    setPayLoading(true);
    const montant = conversation.demande?.gratuit
      ? 0
      : parseFloat((conversation.demande?.prix || "0").replace(/[^0-9.]/g, ""));
    if (montant === 0) {
      alert("Cette demande est gratuite !");
      setPayLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          montant,
          demandeTitle: conversation.demande?.titre,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Erreur paiement : " + data.error);
    } catch {
      alert("Erreur de connexion");
    }
    setPayLoading(false);
  };

  const handleSendAddress = () => {
    sendMessage(`📍 Mon adresse : ${userAddress}`, true);
    setShowAddressPrompt(false);
  };

  const isMe = (senderId: string) => user?.id === senderId;
  const isHelper = user?.id === conversation?.helper_id;
  const isPaid = conversation?.statut === "payé";

  const getTemps = (created_at: string) => {
    const diff = Math.floor((Date.now() - new Date(created_at).getTime()) / 1000);
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    return `${Math.floor(diff / 3600)}h`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/messages")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground truncate">{conversation?.demande?.titre || "Conversation"}</p>
            <p className="text-xs text-muted-foreground">{isPaid ? "✅ Payé" : "💬 En cours"}</p>
          </div>
          {isPaid && <CheckCircle className="w-5 h-5 text-green-500" />}
        </div>
      </header>

      {isPaid && (
        <div className="mx-4 mt-3 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
          <p className="text-sm font-semibold text-green-600">✅ Paiement confirmé</p>
        </div>
      )}

      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto pb-36">
        {messages.map((msg, i) => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            className={`flex ${isMe(msg.sender_id) ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
              msg.is_auto
                ? "bg-primary/10 text-primary border border-primary/20"
                : isMe(msg.sender_id)
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-card border border-border text-foreground rounded-bl-sm"
            }`}>
              {msg.is_auto && <MapPin className="w-3 h-3 inline mr-1" />}
              {msg.content}
              <p className={`text-[10px] mt-1 ${isMe(msg.sender_id) ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {getTemps(msg.created_at)}
              </p>
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      <AnimatePresence>
        {showAddressPrompt && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-4 right-4 bg-card border border-primary/30 rounded-2xl p-4 shadow-lg z-10">
            <p className="text-sm font-semibold text-foreground mb-1">📍 Partager ton adresse ?</p>
            <p className="text-xs text-muted-foreground mb-3">{userAddress}</p>
            <div className="flex gap-2">
              <button onClick={() => setShowAddressPrompt(false)}
                className="flex-1 py-2 rounded-xl bg-secondary text-muted-foreground text-sm font-medium">
                Pas maintenant
              </button>
              <button onClick={handleSendAddress}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
                Envoyer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isHelper && !isPaid && conversation?.demande && !conversation.demande.gratuit && (
        <div className="fixed bottom-20 left-4 right-4 z-10">
          <button onClick={handlePay} disabled={payLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 text-white font-semibold text-sm shadow-lg disabled:opacity-60">
            <CreditCard className="w-4 h-4" />
            {payLoading ? "Redirection..." : `Payer ${conversation.demande.prix} 💳`}
          </button>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <input type="text" placeholder="Écris un message..."
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage(text)}
            className="flex-1 h-11 px-4 rounded-xl bg-secondary border-none text-sm outline-none text-foreground placeholder:text-muted-foreground" />
          <button onClick={() => sendMessage(text)} disabled={!text.trim() || loading}
            className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
