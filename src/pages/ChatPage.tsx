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
}

interface Conversation {
  id: number;
  demande_id: number;
  helper_id: string;
  demandeur_id: string;
  statut: string;
  demande?: {
    titre: string;
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

  const messagesRef = useRef<HTMLDivElement>(null);

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
  const fetchConversation = async () => {
    if (!id) return;

    const { data: conv } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .single();

    if (!conv) return;

    const { data: demande } = await supabase
      .from("demandes")
      .select("titre")
      .eq("id", conv.demande_id)
      .single();

    setConversation({
      ...conv,
      demande,
    });
  };

  // INIT
  useEffect(() => {
    if (!id || !user) return;

    fetchConversation();
    fetchMessages();

    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  // AUTO SCROLL
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop =
        messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // SEND
  const sendMessage = async () => {
    if (!text.trim() || !user || !id) return;

    await supabase.from("messages").insert({
      conversation_id: parseInt(id),
      sender_id: user.id,
      content: text,
    });

    setText("");
  };

  const isMe = (senderId: string) =>
    senderId === user?.id;

  return (
    <div className="h-screen bg-[#071118] text-white flex flex-col overflow-hidden relative">

      {/* BACKGROUND */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#06131a] via-[#071118] to-[#0a2222]" />

      <div className="absolute top-[-100px] left-[-100px] w-[250px] h-[250px] bg-cyan-400/20 blur-[100px] rounded-full -z-10" />

      <div className="absolute bottom-[-100px] right-[-100px] w-[250px] h-[250px] bg-green-400/20 blur-[100px] rounded-full -z-10" />

      {/* HEADER */}
      <div className="h-16 min-h-16 border-b border-white/10 backdrop-blur-xl bg-white/5 px-4 flex items-center gap-3">

        <button
          onClick={() => navigate("/messages")}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="flex-1 overflow-hidden">
          <p className="font-semibold truncate text-white">
            {conversation?.demande?.titre ||
              "Conversation"}
          </p>

          <p className="text-xs text-gray-400">
            💬 Discussion active
          </p>
        </div>
      </div>

      {/* MESSAGES */}
      <div
        ref={messagesRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
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
              className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-lg ${
                isMe(msg.sender_id)
                  ? "bg-gradient-to-r from-cyan-400 to-green-400 text-white"
                  : "bg-white/10 backdrop-blur-xl border border-white/10 text-white"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div className="border-t border-white/10 bg-[#071118]/90 backdrop-blur-xl px-3 py-2">

        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-2 py-2">

          <input
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            onKeyDown={(e) =>
              e.key === "Enter" && sendMessage()
            }
            placeholder="Écris un message..."
            className="flex-1 bg-transparent text-white placeholder:text-gray-400 outline-none px-2 text-sm"
          />

          <button
            onClick={sendMessage}
            className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 flex items-center justify-center"
          >
            <Send className="w-4 h-4 text-white" />
          </button>

        </div>
      </div>
    </div>
  );
};

export default ChatPage;
