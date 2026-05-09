import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] =
    useState<Conversation | null>(null);

  const [text, setText] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);

  // FETCH MESSAGES
  const fetchMessages = async () => {
    if (!id) return;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", parseInt(id))
      .order("created_at", { ascending: true });

    setMessages(data || []);
  };

  // FETCH CONVERSATION
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

    setConversation({
      ...convData,
      demande: demandeData,
    });
  };

  // INIT
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
        () => {
          fetchMessages();

          setTimeout(() => {
            bottomRef.current?.scrollIntoView({
              behavior: "smooth",
            });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  // AUTO SCROLL
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // SEND MESSAGE
  const sendMessage = async (content: string) => {
    if (!content?.trim() || !user || !id) return;

    await supabase.from("messages").insert({
      conversation_id: parseInt(id),
      sender_id: user.id,
      content,
    });

    setText("");
  };

  const isMe = (idSender: string) =>
    user?.id === idSender;

  const isClosed =
    conversation?.statut === "fermée";

  return (
    <div className="h-screen flex flex-col bg-[#071118] text-white relative overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050f14] via-[#071a1f] to-[#062a2a]" />

      <div className="absolute top-[-100px] left-[-80px] w-[300px] h-[300px] bg-cyan-400/20 blur-[120px] rounded-full" />

      <div className="absolute bottom-[-120px] right-[-100px] w-[320px] h-[320px] bg-green-400/20 blur-[140px] rounded-full" />

      {/* HEADER */}
      <header className="relative z-30 flex-shrink-0 p-4 border-b border-white/10 backdrop-blur-xl bg-white/5">

        <div className="flex items-center gap-3">

          <button
            onClick={() => navigate("/messages")}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div>
            <p className="font-semibold text-white text-lg">
              {conversation?.demande?.titre ||
                "Conversation"}
            </p>

            <p className="text-xs text-gray-300">
              {isClosed
                ? "❌ Fermée"
                : "💬 Discussion active"}
            </p>
          </div>
        </div>
      </header>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 relative z-10">

        <div className="space-y-4">

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                isMe(msg.sender_id)
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`px-4 py-3 rounded-2xl text-sm max-w-[75%] shadow-lg backdrop-blur-xl border ${
                  isMe(msg.sender_id)
                    ? "bg-gradient-to-r from-cyan-400 to-green-400 text-white border-transparent"
                    : "bg-white/10 border-white/10 text-white"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />

        </div>
      </div>

      {/* INPUT */}
      {!isClosed && (
        <div className="relative z-30 flex-shrink-0 p-3 border-t border-white/10 bg-[#071118]/90 backdrop-blur-2xl">

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-2">

            <input
              value={text}
              onChange={(e) =>
                setText(e.target.value)
              }
              onKeyDown={(e) =>
                e.key === "Enter" &&
                sendMessage(text)
              }
              placeholder="Écris un message..."
              className="flex-1 bg-transparent px-3 py-2 text-white placeholder:text-gray-400 outline-none"
            />

            <button
              onClick={() => sendMessage(text)}
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 flex items-center justify-center shadow-lg"
            >
              <Send className="w-4 h-4 text-white" />
            </button>

          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
