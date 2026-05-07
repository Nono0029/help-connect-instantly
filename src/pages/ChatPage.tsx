import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Send, MapPin, CreditCard } from "lucide-react";
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
  const [mission, setMission] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [showAddressPrompt, setShowAddressPrompt] = useState(false);
  const [addressDismissed, setAddressDismissed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", parseInt(id))
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const fetchConv = async () => {
    if (!id) return;
    const { data: convData } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .single();
    if (!convData) return;
    const { data: demandeData } = await supabase
      .from("demandes")
      .select("titre, prix, gratuit, user_id")
      .eq("id", convData.demande_id)
      .single();
    setConversation({ ...convData, demande: demandeData });
  };

  const fetchAddress = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("adresse")
      .eq("id", user.id)
      .single();
    if (data?.adresse) setUserAddress(data.adresse);
  };

  useEffect(() => {
    if (!id || !user) return;
    fetchConv();
    fetchMessages();
    fetchAddress();

    const channel = supabase
      .channel(`chat-${id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${parseInt(id)}`,
      }, fetchMessages)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "conversations",
        filter: `id=eq.${id}`,
      }, (payload) => {
        setConversation(prev => prev ? { ...prev, statut: payload.new.statut } : prev);
      })
      .subscribe();

    const interval = setInterval(fetchMessages, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [id, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Proposition adresse au premier message si demandeur
  useEffect(() => {
    if (
      conversation &&
      userAddress &&
      !addressDismissed &&
      user?.id === conversation.demande?.user_id &&
      messages.length === 0
    ) {
      setShowAddressPrompt(true);
    }
  }, [conversation, userAddress]);

  // Après paiement réussi
useEffect(() => {
  const createMission = async () => {
    if (
      searchParams.get("success") === "true" &&
      conversation?.statut === "payé" &&
      conversation &&
      user
    ) {

      // Vérifie si une mission existe déjà
      const { data: existingMission } = await supabase
        .from("missions")
        .select("*")
        .eq("demande_id", conversation.demande_id)
        .maybeSingle();

      // Créer mission si elle n'existe pas
      if (!existingMission) {

        const prixMission = conversation.demande?.gratuit
          ? 0
          : parseFloat(
              (conversation.demande?.prix || "0")
                .toString()
                .replace(/[^0-9.]/g, "")
            );

        const { error } = await supabase
          .from("missions")
          .insert({
            demande_id: conversation.demande_id,
            demandeur_id: conversation.demandeur_id,
            helper_id: conversation.helper_id,
            statut: "en_cours",
            prix: prixMission
          });

        console.log("MISSION ERROR :", error);
      }

      // Proposition adresse
      if (
        user.id === conversation.demande?.user_id &&
        userAddress
      ) {
        setShowAddressPrompt(true);
      }
    }
  };

  createMission();
}, [conversation, searchParams, user, userAddress]);

  const sendNotification = async (content: string) => {
    if (!conversation || !user) return;
    // Envoyer notif à l'autre personne
    const otherUserId = user.id === conversation.helper_id
      ? conversation.demandeur_id
      : conversation.helper_id;
    if (!otherUserId || otherUserId === "EMPTY") return;
    await supabase.from("notifications").insert([{
      user_id: otherUserId,
      message: content,
      conversation_id: parseInt(id!),
      lu: false,
    }]);
  };

  const sendMessage = async (content: string, isAuto = false) => {
    if (!content.trim() || !user || !id) return;
    if (conversation?.statut === "fermée") return;

    setLoading(true);

    const { error } = await supabase.from("messages").insert([{
      conversation_id: parseInt(id),
      sender_id: user.id,
      content,
      is_auto: isAuto,
    }]);

    if (error) {
      alert("Erreur : " + error.message);
      setLoading(false);
      return;
    }

    // Envoyer une notification à l'autre utilisateur
    const pseudo = user.email?.split("@")[0] || "Quelqu'un";
    await sendNotification(`💬 ${pseudo} t'a envoyé un message`);

    await fetchMessages();
    setText("");
    setLoading(false);
  };

  const handleSendAddress = () => {
    sendMessage(`📍 Mon adresse : ${userAddress}`, true);
    setShowAddressPrompt(false);
    setAddressDismissed(true);
  };

  const handleDismissAddress = () => {
    setShowAddressPrompt(false);
    setAddressDismissed(true);
  };

  const handlePay = async () => {
    if (!conversation || messages.length < 5) return;
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

  const isMe = (senderId: string) => user?.id === senderId;
  const isHelper = user?.id === conversation?.helper_id;
  const isPaid = conversation?.statut === "payé";
  const isClosed = conversation?.statut === "fermée";
  const canPay = messages.length >= 5;

  const getTemps = (created_at: string) => {
    const diff = Math.floor((Date.now() - new Date(created_at).getTime()) / 1000);
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    return `${Math.floor(diff / 3600)}h`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/messages")} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground truncate">
              {conversation?.demande?.titre || "Conversation"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isClosed ? "❌ Fermée" : isPaid ? "✅ Payé" : "💬 En cours"}
            </p>
          </div>

          {/* Bouton payer */}
          {isHelper && !isPaid && !isClosed && conversation?.demande && !conversation.demande.gratuit && (
            <button
              onClick={handlePay}
              disabled={!canPay || payLoading}
              title={!canPay ? `Encore ${5 - messages.length} message(s) avant de pouvoir payer` : "Payer"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                canPay
                  ? "bg-green-500 text-white shadow-md hover:bg-green-600"
                  : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              {payLoading ? "..." : canPay ? `Payer ${conversation.demande.prix}` : `🔒 ${messages.length}/5`}
            </button>
          )}
        </div>

        {/* Barre de progression */}
        {isHelper && !isPaid && !isClosed && !canPay && (
          <div className="mt-2">
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all rounded-full"
                style={{ width: `${(messages.length / 5) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {5 - messages.length} message{5 - messages.length > 1 ? "s" : ""} avant de pouvoir payer
            </p>
          </div>
        )}
      </header>

      {/* Bandeau fermée */}
      {isClosed && (
        <div className="mx-4 mt-3 px-4 py-2 bg-destructive/10 border border-destructive/30 rounded-xl text-center">
          <p className="text-sm font-semibold text-destructive">❌ Cette conversation est fermée</p>
        </div>
      )}

      {/* Bandeau payé */}
      {isPaid && (
        <div className="mx-4 mt-3 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
          <p className="text-sm font-semibold text-green-600">✅ Paiement confirmé</p>
        </div>
      )}

      {/* MESSAGES */}
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto pb-36">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${isMe(msg.sender_id) ? "justify-end" : "justify-start"}`}>
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
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* PROPOSITION ADRESSE */}
      {showAddressPrompt && !isClosed && (
        <div className="fixed bottom-20 left-4 right-4 bg-card border border-primary/30 rounded-2xl p-3 shadow-lg z-20">
          <p className="text-xs font-semibold text-foreground mb-1">
            📍 Partager ton adresse pour l'intervention ?
          </p>
          <p className="text-xs text-muted-foreground mb-2 truncate">{userAddress}</p>
          <div className="flex gap-2">
            <button
              onClick={handleDismissAddress}
              className="flex-1 py-2 rounded-xl bg-secondary text-muted-foreground text-xs font-medium"
            >
              Non
            </button>
            <button
              onClick={handleSendAddress}
              className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium"
            >
              Oui, envoyer
            </button>
          </div>
        </div>
      )}

      {/* INPUT */}
      {!isClosed && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Écris un message..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage(text)}
              className="flex-1 h-11 px-4 rounded-xl bg-secondary border-none text-sm outline-none text-foreground placeholder:text-muted-foreground"
            />
            <button
              onClick={() => sendMessage(text)}
              disabled={!text.trim() || loading}
              className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
