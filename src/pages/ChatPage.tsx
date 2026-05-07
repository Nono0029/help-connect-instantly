import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
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
  demande?: {
    titre: string;
    prix?: string;
    gratuit?: boolean;
    user_id?: string;
  };
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

  // ---------------- INIT ----------------
  useEffect(() => {
    if (!id || !user) return;

    fetchConv();
    fetchMessages();

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

  // ---------------- LOAD MISSION WHEN CONVERSATION ARRIVES ----------------
  useEffect(() => {
    if (conversation) {
      fetchMission(conversation);
    }
  }, [conversation]);

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

  // ---------------- SEND MESSAGE ----------------
  const sendMessage = async (content: string) => {
    if (!content?.trim() || !user || !id) return;
    if (conversation?.statut === "fermée") return;

    await supabase.from("messages").insert({
      conversation_id: parseInt(id),
      sender_id: user.id,
      content,
    });

    setText("");
    fetchMessages();
  };

  const isClosed = conversation?.statut === "fermée";
  const isPaid = conversation?.statut === "payé";
  const isMe = (idSender: string) => user?.id === idSender;

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* HEADER */}
      <header className="p-3 border-b flex items-center gap-3">
        <button onClick={() => navigate("/messages")}>
          <ArrowLeft />
        </button>

        <div>
          <p className="font-bold">
            {conversation?.demande?.titre || "Conversation"}
          </p>
          <p className="text-xs text-gray-500">
            {isClosed ? "Fermée" : isPaid ? "Payé" : "En cours"}
          </p>
        </div>
      </header>

      {/* MESSAGES */}
      <div className="flex-1 p-4 space-y-2 overflow-y-auto pb-32">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${isMe(msg.sender_id) ? "justify-end" : "justify-start"}`}
          >
            <div className="px-3 py-2 rounded-xl bg-card border text-sm">
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

      {/* INPUT (TON STYLE RESTAURÉ) */}
      {!isClosed && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/90 border-t px-4 py-3">
          <div className="flex gap-2 items-center">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(text)}
              placeholder="Écris un message..."
              className="flex-1 h-11 px-4 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none"
            />

            <button
              onClick={() => sendMessage(text)}
              className="w-11 h-11 bg-primary text-white rounded-xl flex items-center justify-center"
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
