import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [showAddressPrompt, setShowAddressPrompt] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isClosed = conversation?.statut === "fermée";

  // FETCH DATA
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

  // ✅ FIX PROPOSITION ADRESSE
  useEffect(() => {
    if (
      conversation &&
      userAddress &&
      user?.id === conversation.demandeur_id &&
      messages.length === 0
    ) {
      setShowAddressPrompt(true);
    }
  }, [conversation, userAddress]);

  // SEND MESSAGE
  const sendMessage = async (content: string, isAuto = false) => {
    if (!content.trim() || !user || !id || isClosed) return;

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

  const handleSendAddress = () => {
    sendMessage(`📍 Mon adresse : ${userAddress}`, true);
    setShowAddressPrompt(false);
  };

  const handlePay = async () => {
    if (!conversation || messages.length < 5) return;

    setPayLoading(true);

    const montant = conversation.demande?.gratuit
      ? 0
      : parseFloat((conversation.demande?.prix || "0").replace(/[^0-9.]/g, ""));

    if (montant === 0) {
      alert("Gratuit");
      setPayLoading(false);
      return;
    }

    const res = await fetch("/api/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: conversation.id, montant }),
    });

    const data = await res.json();

    if (data.url) window.location.href = data.url;

    setPayLoading(false);
  };

  const isMe = (senderId: string) => user?.id === senderId;
  const isHelper = user?.id === conversation?.helper_id;
  const isPaid = conversation?.statut === "payé";
  const canPay = messages.length >= 5;

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* HEADER */}
      <header className="p-3 border-b flex items-center gap-3">
        <button onClick={() => navigate("/messages")}>
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1">
          <p className="font-bold">{conversation?.demande?.titre}</p>
          <p className="text-xs text-muted-foreground">
            {isClosed ? "❌ Fermée" : isPaid ? "✅ Payé" : "💬 En cours"}
          </p>
        </div>

        {isHelper && !isPaid && !isClosed && (
          <button
            onClick={handlePay}
            disabled={!canPay || payLoading}
            className={`px-3 py-1 rounded-xl text-xs ${
              canPay ? "bg-green-500 text-white" : "bg-gray-300"
            }`}
          >
            {canPay ? "Payer" : `${messages.length}/5`}
          </button>
        )}
      </header>

      {/* MESSAGE FERMÉ */}
      {isClosed && (
        <div className="p-3 text-center text-red-500 text-sm">
          ❌ Cette conversation est fermée
        </div>
      )}

      {/* MESSAGES */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {messages.map(msg => (
          <div key={msg.id} className={isMe(msg.sender_id) ? "text-right" : ""}>
            <div className="inline-block bg-card px-3 py-2 rounded-xl">
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* PROPOSITION ADRESSE */}
      {showAddressPrompt && !isClosed && (
        <div className="p-3 border-t bg-card">
          <p className="text-xs mb-2">Partager ton adresse ?</p>
          <div className="flex gap-2">
            <button onClick={() => setShowAddressPrompt(false)}>Non</button>
            <button onClick={handleSendAddress}>Oui</button>
          </div>
        </div>
      )}

      {/* INPUT */}
      {!isClosed && (
        <div className="p-3 border-t flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            className="flex-1 border rounded px-3"
          />
          <button onClick={() => sendMessage(text)}>
            <Send />
          </button>
        </div>
      )}

    </div>
  );
};

export default ChatPage;
