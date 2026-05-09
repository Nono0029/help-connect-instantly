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
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [mission, setMission] = useState<any>(null);
  const [text, setText] = useState("");

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

  const sendMessage = async (content: string) => {
    if (!content?.trim() || !user || !id) return;

    await supabase.from("messages").insert({
      conversation_id: parseInt(id),
      sender_id: user.id,
      content,
    });

    setText("");
    fetchMessages();

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const isMe = (idSender: string) => user?.id === idSender;

  const isClosed = conversation?.statut === "fermée";

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden text-white">

      {/* 🌌 BACKGROUND GLOW */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050f14] via-[#071a1f] to-[#062a2a]" />

      <div className="absolute top-[-100px] left-[-80px] w-[300px] h-[300px] bg-cyan-400/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-120px] right-[-100px] w-[320px] h-[320px] bg-green-400/20 blur-[140px] rounded-full" />

      {/* HEADER GLASS */}
      <header className="relative z-10 p-4 border-b border-white/10 backdrop-blur-xl bg-white/5">

        <div className="flex items-center gap-3">

          <button
            onClick={() => navigate("/messages")}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center backdrop-blur-md shadow-lg"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div>
            <p className="font-semibold text-white text-lg drop-shadow">
              {conversation?.demande?.titre || "Conversation"}
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
      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-32 relative z-10">

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${
              isMe(msg.sender_id) ? "justify-end" : "justify-start"
            }`}
          >

            {/* bubble glass */}
            <div
              className={`px-4 py-3 rounded-2xl text-sm max-w-[75%] backdrop-blur-xl border shadow-lg transition ${
                isMe(msg.sender_id)
                  ? "bg-gradient-to-r from-cyan-400/90 to-green-400/90 text-white shadow-cyan-500/30"
                  : "bg-white/10 border-white/10 text-white"
              }`}
            >
              {msg.content}
            </div>

          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* INPUT GLASS */}
      {!isClosed && (
        <div className="fixed bottom-0 left-0 right-0 p-3 z-20">

          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-xl">

            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(text)}
              placeholder="Écris un message..."
              className="flex-1 bg-transparent px-3 py-2 text-white placeholder:text-gray-400 outline-none"
            />

            <button
              onClick={() => sendMessage(text)}
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 flex items-center justify-center shadow-lg hover:scale-105 transition"
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
