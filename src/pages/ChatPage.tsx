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
  const [mission, setMission] = useState<any>(null);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  const [userAddress, setUserAddress] = useState("");
  const [showAddressPrompt, setShowAddressPrompt] = useState(false);
  const [addressDismissed, setAddressDismissed] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // ---------------- MESSAGES ----------------
  const fetchMessages = async () => {
    if (!id) return;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", parseInt(id))
      .order("created_at", { ascending: true });

    setMessages(data || []);
  };

  // ---------------- CONVERSATION ----------------
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

  // ---------------- MISSION ----------------
  const fetchMission = async (conv: any) => {
    if (!conv) return;

    const { data } = await supabase
      .from("missions")
      .select("*")
      .eq("demande_id", conv.demande_id)
      .maybeSingle();

    if (data) setMission(data);
  };

  const confirmerMission = async () => {
    if (!mission || !user) return;

    const updates: any = {};

    if (user.id === mission.helper_id) updates.helper_confirme = true;
    if (user.id === mission.demandeur_id) updates.demandeur_confirme = true;

    await supabase
      .from("missions")
      .update(updates)
      .eq("id", mission.id);

    const helper = updates.helper_confirme ?? mission.helper_confirme;
    const demandeur = updates.demandeur_confirme ?? mission.demandeur_confirme;

    if (helper && demandeur) {
      await supabase
        .from("missions")
        .update({ statut: "terminee" })
        .eq("id", mission.id);
    }

    fetchMission(conversation);
  };

  // ---------------- ADDRESS ----------------
  const fetchAddress = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("adresse")
      .eq("id", user.id)
      .single();

    if (data?.adresse) setUserAddress(data.adresse);
  };

  // ---------------- INIT ----------------
  useEffect(() => {
    if (!id || !user) return;

    fetchConv();
    fetchMessages();
    fetchAddress();

    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${parseInt(id)}`,
        },
        fetchMessages
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  // ---------------- CREATE MISSION AFTER PAYMENT ----------------
  useEffect(() => {
    const createMission = async () => {
      if (
        searchParams.get("success") === "true" &&
        conversation &&
        user
      ) {
        const { data: existing } = await supabase
          .from("missions")
          .select("*")
          .eq("demande_id", conversation.demande_id)
          .maybeSingle();

        if (!existing) {
          await supabase.from("missions").insert({
            demande_id: conversation.demande_id,
            demandeur_id: conversation.demandeur_id,
            helper_id: conversation.helper_id,
            statut: "en_cours",
            prix: conversation.demande?.prix || 0,
          });
        }

        fetchMission(conversation);
      }
    };

    createMission();
  }, [conversation, searchParams, user]);

  // ---------------- SEND MESSAGE (IMPORTANT RESTAURÉ) ----------------
  const sendMessage = async (content: string, isAuto = false) => {
    if (!content.trim() || !user || !id) return;
    if (conversation?.statut === "fermée") return;

    const { error } = await supabase.from("messages").insert({
      conversation_id: parseInt(id),
      sender_id: user.id,
      content,
      is_auto: isAuto,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setText("");
    fetchMessages();
  };

  const isClosed = conversation?.statut === "fermée";
  const isPaid = conversation?.statut === "payé";
  const isHelper = user?.id === conversation?.helper_id;

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* HEADER (inchangé) */}
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
              {isClosed ? "Fermée" : isPaid ? "Payé" : "En cours"}
            </p>
          </div>
        </div>
      </header>

      {/* MESSAGES (inchangé logique) */}
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto pb-36">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              user?.id === msg.sender_id ? "justify-end" : "justify-start"
            }`}
          >
            <div className="px-4 py-2 rounded-2xl bg-card border text-sm">
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* BOUTON MISSION */}
      {mission?.statut === "en_cours" && (
        <div className="p-3">
          <button
            onClick={confirmerMission}
            className="w-full bg-green-500 text-white py-3 rounded-xl"
          >
            ✅ Confirmer la mission
          </button>
        </div>
      )}

     {/* INPUT RESTAURÉ (style original) */}
{!isClosed && (
  <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t border-border px-4 py-3">
    <div className="flex items-center gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage(text)}
        placeholder="Écris un message..."
        className="flex-1 h-11 px-4 rounded-xl bg-secondary border-none text-sm outline-none text-foreground placeholder:text-muted-foreground"
      />

      <button
        onClick={() => sendMessage(text)}
        disabled={!text.trim()}
        className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  </div>
)}

export default ChatPage;
