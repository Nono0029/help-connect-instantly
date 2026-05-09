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
    if (user.id === mission.demandeur_id)
      updates.demandeur_confirme = true;

    await supabase
      .from("missions")
      .update(updates)
      .eq("id", mission.id);

    const helper =
      updates.helper_confirme ?? mission.helper_confirme;

    const demandeur =
      updates.demandeur_confirme ??
      mission.demandeur_confirme;

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

  // ---------------- LOAD MISSION ----------------
  useEffect(() => {
    if (conversation) {
      fetchMission(conversation);
    }
  }, [conversation]);

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

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }, 100);
  };

  const isClosed = conversation?.statut === "fermée";

  const isMe = (idSender: string) =>
    user?.id === idSender;

  // ---------------- AVIS ----------------
  const laisserAvis = async () => {
    if (!mission || !user) return;

    const note = prompt("Note sur 5 ?");
    const commentaire = prompt("Commentaire ?");

    if (!note) return;

    const cibleId =
      user.id === mission.helper_id
        ? mission.demandeur_id
        : mission.helper_id;

    await supabase.from("avis").insert({
      mission_id: mission.id,
      auteur_id: user.id,
      cible_id: cibleId,
      note: parseInt(note),
      commentaire,
    });

    alert("Avis envoyé ⭐");
  };

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-cyan-50 via-white to-green-50 relative overflow-hidden">

      {/* 🌈 DÉCOS */}
      <div className="absolute top-24 left-4 text-4xl opacity-20">
        ☁️
      </div>

      <div className="absolute top-40 right-6 text-3xl opacity-20">
        🌱
      </div>

      <div className="absolute bottom-40 left-10 text-3xl opacity-20">
        💙
      </div>

      <div className="absolute bottom-64 right-8 text-4xl opacity-20">
        ✨
      </div>

      {/* HEADER */}
      <header className="p-4 border-b border-cyan-100 bg-white/70 backdrop-blur-xl sticky top-0 z-50">

        <div className="flex items-center gap-3">

          <button
            onClick={() => navigate("/messages")}
            className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-cyan-700" />
          </button>

          <div>
            <p className="font-bold text-foreground text-lg">
              {conversation?.demande?.titre ||
                "Conversation"}
            </p>

            <p className="text-xs text-gray-500 mt-0.5">
              {isClosed
                ? "❌ Fermée"
                : mission?.statut === "terminee"
                ? "✅ Mission terminée"
                : mission?.statut === "en_cours"
                ? "🛠 Mission en cours"
                : "💬 Discussion active"}
            </p>
          </div>

        </div>
      </header>

      {/* MESSAGES */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-40 z-10">

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${
              isMe(msg.sender_id)
                ? "justify-end"
                : "justify-start"
            }`}
          >

            {/* AVATAR AUTRE */}
            {!isMe(msg.sender_id) && (
              <div className="w-8 h-8 rounded-full bg-cyan-200 flex items-center justify-center text-xs shadow-sm">
                🌿
              </div>
            )}

            {/* BULLE */}
            <div
              className={`px-4 py-3 rounded-3xl text-sm max-w-[75%] shadow-sm ${
                isMe(msg.sender_id)
                  ? "bg-gradient-to-r from-cyan-400 to-green-400 text-white"
                  : "bg-white border border-cyan-100 text-foreground"
              }`}
            >
              {msg.content}
            </div>

            {/* AVATAR MOI */}
            {isMe(msg.sender_id) && (
              <div className="w-8 h-8 rounded-full bg-green-300 flex items-center justify-center text-xs shadow-sm">
                😊
              </div>
            )}

          </div>
        ))}

        <div ref={bottomRef} />

      </div>

      {/* BOUTON CONFIRMER */}
      {mission?.statut === "en_cours" && (
        <div className="fixed bottom-24 left-0 right-0 px-4 z-40">

          <button
            onClick={confirmerMission}
            className="w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white py-3 rounded-2xl shadow-xl text-sm font-semibold"
          >
            ✅ Confirmer la mission
          </button>

        </div>
      )}

      {/* BOUTON AVIS */}
      {mission?.statut === "terminee" && (
        <div className="fixed bottom-24 left-0 right-0 px-4 z-40">

          <button
            onClick={laisserAvis}
            className="w-full bg-gradient-to-r from-yellow-300 to-orange-400 text-white py-3 rounded-2xl shadow-xl text-sm font-semibold"
          >
            ⭐ Laisser un avis
          </button>

        </div>
      )}

      {/* INPUT */}
      {!isClosed && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-cyan-100 px-4 py-3 z-50">

          <div className="flex gap-2 items-center">

            <input
              value={text}
              onChange={(e) =>
                setText(e.target.value)
              }
              onKeyDown={(e) =>
                e.key === "Enter" &&
                sendMessage(text)
              }
              placeholder="Écris un message 💬"
              className="flex-1 h-12 px-5 rounded-2xl bg-cyan-50 border border-cyan-100 text-foreground placeholder:text-gray-400 outline-none"
            />

            <button
              onClick={() => sendMessage(text)}
              className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-green-400 text-white rounded-2xl flex items-center justify-center shadow-lg"
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
