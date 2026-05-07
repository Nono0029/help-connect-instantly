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

  // -------------------------
  // FETCH MESSAGES
  // -------------------------
  const fetchMessages = async () => {
    if (!id) return;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", parseInt(id))
      .order("created_at", { ascending: true });

    setMessages(data || []);
  };

  // -------------------------
  // FETCH CONVERSATION
  // -------------------------
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

    const fullConv = { ...convData, demande: demandeData };

    setConversation(fullConv);

    fetchMission(fullConv);
  };

  // -------------------------
  // FETCH MISSION
  // -------------------------
  const fetchMission = async (conv: any) => {
    if (!conv) return;

    const { data } = await supabase
      .from("missions")
      .select("*")
      .eq("demande_id", conv.demande_id)
      .maybeSingle();

    if (data) setMission(data);
  };

  // -------------------------
  // CONFIRMER MISSION
  // -------------------------
  const confirmerMission = async () => {
    if (!mission || !user) return;

    const updates: any = {};

    if (user.id === mission.helper_id) {
      updates.helper_confirme = true;
    }

    if (user.id === mission.demandeur_id) {
      updates.demandeur_confirme = true;
    }

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

  // -------------------------
  // FETCH ADDRESS
  // -------------------------
  const fetchAddress = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("adresse")
      .eq("id", user.id)
      .single();

    if (data?.adresse) setUserAddress(data.adresse);
  };

  // -------------------------
  // INIT
  // -------------------------
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  // -------------------------
  // CREATE MISSION AFTER PAYMENT
  // -------------------------
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
            prix: conversation.demande?.prix || 0
          });
        }

        fetchMission(conversation);
      }
    };

    createMission();
  }, [conversation, searchParams, user]);

  // -------------------------
  // SEND MESSAGE
  // -------------------------
  const sendMessage = async (content: string, isAuto = false) => {
    if (!content.trim() || !user || !id) return;

    await supabase.from("messages").insert({
      conversation_id: parseInt(id),
      sender_id: user.id,
      content,
      is_auto: isAuto,
    });

    setText("");
    fetchMessages();
  };

  const isClosed = conversation?.statut === "fermée";
  const isPaid = conversation?.statut === "payé";
  const isHelper = user?.id === conversation?.helper_id;

  // -------------------------
  // UI
  // -------------------------
  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* HEADER */}
      <header className="p-3 border-b flex items-center gap-3">
        <button onClick={() => navigate("/messages")}>
          <ArrowLeft />
        </button>
        <div>
          <p className="font-bold">{conversation?.demande?.titre}</p>
          <p className="text-xs text-gray-500">
            {isPaid ? "Payé" : isClosed ? "Fermé" : "En cours"}
          </p>
        </div>
      </header>

      {/* MESSAGES */}
      <div className="flex-1 p-4 space-y-2">
        {messages.map(m => (
          <div key={m.id} className="text-sm">
            {m.content}
          </div>
        ))}
      </div>

      {/* BOUTON MISSION */}
      {mission?.statut === "en_cours" && (
        <div className="p-3">
          <button
            onClick={confirmerMission}
            className="w-full bg-green-500 text-white p-3 rounded-xl"
          >
            Confirmer la mission
          </button>
        </div>
      )}

      {/* INPUT */}
      {!isClosed && (
        <div className="p-3 flex gap-2 border-t">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 border p-2 rounded"
            placeholder="Message..."
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
