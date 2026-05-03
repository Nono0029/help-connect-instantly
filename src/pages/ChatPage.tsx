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

  // 🔥 fetch messages
  const fetchMessages = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", parseInt(id))
      .order("created_at", { ascending: true });

    if (error) {
      console.log("ERREUR FETCH MESSAGES:", error);
      return;
    }

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

    if (error) {
      console.log("ERREUR CONV:", error);
      return;
    }

    setConversation(data);
  };

  // 🔥 fetch adresse
  const fetchAddress = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("adresse")
      .eq("id", user.id)
      .single();

    if (data?.adresse) setUserAddress(data.adresse);
  };

  // 🔥 LOAD INITIAL
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
        filter: `conversation_id=eq.${id}`,
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  // 🔥 scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔥 paiement success
  useEffect(() => {
    if (searchParams.get("success") === "true" && conversation?.statut === "payé") {
      if (user?.id === conversation.demandeur_id && userAddress) {
        setShowAddressPrompt(true);
      }
    }
  }, [conversation, searchParams, user, userAddress]);

  // 🔥 send message (FIX IMPORTANT)
  const sendMessage = async (content: string, isAuto = false) => {
    if (!content.trim() || !user || !id) return;

    setLoading(true);

    const { error } = await supabase.from("messages").insert([{
      conversation_id: parseInt(id),
      sender_id: user.id,
      content,
      is_auto: isAuto,
    }]);

    if (error) {
      console.log("ERREUR MESSAGE:", error);
      alert("Erreur envoi message");
      setLoading(false);
      return;
    }

    setText("");
    setLoading(false);
  };

  // 💳 paiement FIX
  const handlePay = async () => {
    if (!conversation) return;

    setPayLoading(true);

    const montant = conversation.demande?.gratuit
      ? 0
      : parseFloat((conversation.demande?.prix || "0").replace(/[^0-9.]/g, ""));

    if (montant === 0) {
      alert("Demande gratuite");
      setPayLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          price: montant, // ✅ FIX
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Erreur paiement");
      }

    } catch (err) {
      console.log(err);
      alert("Erreur connexion");
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

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-background border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/messages")}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="font-bold">{conversation?.demande?.titre}</p>
          <p className="text-xs">{isPaid ? "✅ Payé" : "💬 En cours"}</p>
        </div>
      </header>

      {/* MESSAGES */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto pb-32">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${isMe(msg.sender_id) ? "justify-end" : "justify-start"}`}>
            <div className="px-4 py-2 rounded-xl bg-card">
              {msg.is_auto && <MapPin className="w-3 h-3 inline mr-1" />}
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* PAYER */}
      {isHelper && !isPaid && (
        <div className="p-4">
          <button onClick={handlePay} className="w-full bg-green-500 text-white py-3 rounded-xl">
            💳 Payer
          </button>
        </div>
      )}

      {/* INPUT */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          className="flex-1 p-2 rounded-xl bg-secondary"
        />
        <button onClick={() => sendMessage(text)}>
          <Send />
        </button>
      </div>
    </div>
  );
};

export default ChatPage;
