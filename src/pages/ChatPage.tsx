import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Star,
  MapPin,
  ShieldCheck,
} from "lucide-react";

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

  const [mission, setMission] = useState<any>(null);

  const [text, setText] = useState("");

  // ⭐ AVIS
  const [showAvis, setShowAvis] = useState(false);
  const [note, setNote] = useState(5);
  const [commentaire, setCommentaire] =
    useState("");

  // 📍 ADRESSE
  const [showAdresseBox, setShowAdresseBox] =
    useState(false);

  const [adresse, setAdresse] = useState("");
  const [ville, setVille] = useState("");

  const [adresseEnvoyee, setAdresseEnvoyee] =
    useState(false);

  const messagesRef = useRef<HTMLDivElement>(null);

  // ---------------- FETCH MESSAGES ----------------
  const fetchMessages = async () => {
    if (!id) return;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", parseInt(id))
      .order("created_at", { ascending: true });

    setMessages(data || []);
  };

  // ---------------- FETCH CONVERSATION ----------------
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

  // ---------------- FETCH PROFILE ----------------
  const fetchProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("adresse, ville")
      .eq("id", user.id)
      .single();

    if (data) {
      setAdresse(data.adresse || "");
      setVille(data.ville || "");
    }
  };

  // ---------------- FETCH MISSION ----------------
  const fetchMission = async (conv: any) => {
    if (!conv) return;

    const { data } = await supabase
      .from("missions")
      .select("*")
      .eq("demande_id", conv.demande_id)
      .maybeSingle();

    if (data) {
      setMission(data);
    }
  };

  // ---------------- CONFIRM MISSION ----------------
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

    const helper =
      updates.helper_confirme ??
      mission.helper_confirme;

    const demandeur =
      updates.demandeur_confirme ??
      mission.demandeur_confirme;

    if (helper && demandeur) {
      await supabase
        .from("missions")
        .update({
          statut: "terminee",
        })
        .eq("id", mission.id);
    }

    fetchMission(conversation);
  };

  // ---------------- ENVOYER AVIS ----------------
  const envoyerAvis = async () => {
    if (!mission || !user) return;

    const cibleId =
      user.id === mission.helper_id
        ? mission.demandeur_id
        : mission.helper_id;

    await supabase.from("avis").insert({
      mission_id: mission.id,
      auteur_id: user.id,
      cible_id: cibleId,
      note,
      commentaire,
    });

    setShowAvis(false);
    setCommentaire("");
    setNote(5);
  };

  // ---------------- ENVOYER ADRESSE ----------------
  const envoyerAdresse = async () => {
    if (!adresse.trim()) return;

    const messageAdresse = `📍 Mon adresse :
${adresse}
${ville}`;

    await supabase.from("messages").insert({
      conversation_id: parseInt(id!),
      sender_id: user?.id,
      content: messageAdresse,
    });

    setAdresseEnvoyee(true);
    setShowAdresseBox(false);
  };

  // ---------------- INIT ----------------
  useEffect(() => {
    if (!id || !user) return;

    fetchConversation();
    fetchMessages();
    fetchProfile();

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

  // ---------------- LOAD MISSION ----------------
  useEffect(() => {
    if (conversation) {
      fetchMission(conversation);
    }
  }, [conversation]);

  // ---------------- AUTO SCROLL ----------------
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop =
        messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // ---------------- SHOW ADDRESS AFTER 5 MSG ----------------
  useEffect(() => {
    if (messages.length >= 5 && !adresseEnvoyee) {
      setShowAdresseBox(true);
    }
  }, [messages]);

  // ---------------- SEND MESSAGE ----------------
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

  const isClosed =
    conversation?.statut === "fermée";

  return (
  <div className="h-screen text-[#5f5f52] flex flex-col overflow-hidden relative bg-[#fffdf4]">

    {/* 🌈 BACKGROUND */}
    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#fff9dc] via-[#f4ffe9] to-[#ffffff]" />

    <div className="absolute top-[-120px] left-[-120px] w-[260px] h-[260px] bg-[#fff3a6]/40 blur-[120px] rounded-full -z-10" />

    <div className="absolute bottom-[-120px] right-[-120px] w-[260px] h-[260px] bg-[#c8ffb0]/40 blur-[120px] rounded-full -z-10" />

    <div className="absolute top-[40%] left-[10%] w-[140px] h-[140px] bg-[#ffffff]/60 blur-[80px] rounded-full -z-10" />

    {/* 🌟 HEADER */}
    <div className="min-h-[88px] border-b border-[#edf1d6] backdrop-blur-2xl bg-white/60 px-4 pt-4 pb-3 flex items-start gap-3 z-20 shadow-[0_4px_30px_rgba(255,240,180,0.15)]">

      <button
        onClick={() => navigate("/messages")}
        className="w-10 h-10 rounded-full bg-white shadow-md border border-[#f5efc9] flex items-center justify-center shrink-0"
      >
        <ArrowLeft className="w-5 h-5 text-[#87b96d]" />
      </button>

      <div className="flex-1 overflow-hidden">

        <p className="font-bold truncate text-[#6f7b5c] text-[15px]">
          {conversation?.demande?.titre ||
            "Conversation"}
        </p>

        <p className="text-xs text-[#98a67c] mt-0.5">
          {isClosed
            ? "❌ Conversation fermée"
            : mission?.statut === "terminee"
            ? "⭐ Mission terminée"
            : mission?.statut === "en_cours"
            ? "🌱 Mission en cours"
            : "💬 Discussion bienveillante"}
        </p>

        {/* 🌈 PROGRESSION */}
        {messages.length < 5 && (
          <div className="mt-3">

            <div className="flex items-center justify-between text-[10px] text-[#a3ad8d] mb-1">

              <span>
                Débloque le paiement sécurisé ✨
              </span>

              <span>
                {messages.length}/5
              </span>

            </div>

            <div className="w-full h-2 bg-[#f3f1df] rounded-full overflow-hidden shadow-inner">

              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ffe27a] via-[#fff1a6] to-[#b8f593] transition-all duration-500 shadow-[0_0_12px_rgba(220,255,150,0.8)]"
                style={{
                  width: `${Math.min(
                    (messages.length / 5) * 100,
                    100
                  )}%`,
                }}
              />

            </div>

          </div>
        )}

        {/* ✅ DÉBLOQUÉ */}
        {messages.length >= 5 && (
          <div className="mt-3 flex items-center gap-2">

            <div className="w-2 h-2 rounded-full bg-[#98e97d] animate-pulse shadow-[0_0_10px_#98e97d]" />

            <p className="text-[11px] text-[#7eb36a] font-semibold">
              Paiement sécurisé débloqué ✨
            </p>

          </div>
        )}

      </div>
    </div>

    {/* 💬 MESSAGES */}
    <div
      ref={messagesRef}
      className="flex-1 overflow-y-auto px-4 py-5 space-y-3 pb-56"
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
            className={`max-w-[78%] px-4 py-3 rounded-[26px] text-sm shadow-lg break-words backdrop-blur-xl ${
              isMe(msg.sender_id)
                ? "bg-gradient-to-r from-[#ffe27a] to-[#c6f7a6] text-[#5f5f52] shadow-[0_8px_25px_rgba(255,226,122,0.35)]"
                : "bg-white/75 border border-[#edf1d6] text-[#68715d] shadow-[0_8px_25px_rgba(220,230,190,0.18)]"
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}
    </div>

    {/* 📍 ADRESSE */}
    {showAdresseBox && !adresseEnvoyee && (
      <div className="fixed bottom-28 left-4 right-4 z-40">

        <div className="rounded-[30px] bg-white/75 border border-[#edf1d6] p-5 shadow-[0_10px_40px_rgba(255,230,150,0.25)] backdrop-blur-2xl">

          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-[#9ad67d]" />

            <p className="font-bold text-[#6f7b5c]">
              Envoyer ton adresse ?
            </p>
          </div>

          <p className="text-sm text-[#9aa48a] mb-4">
            Tu peux la modifier avant l’envoi 🌼
          </p>

          <input
            value={adresse}
            onChange={(e) =>
              setAdresse(e.target.value)
            }
            placeholder="Adresse"
            className="w-full h-12 rounded-2xl bg-[#fffef7] border border-[#eef1d7] px-4 text-sm text-[#5f5f52] mb-3 outline-none"
          />

          <input
            value={ville}
            onChange={(e) =>
              setVille(e.target.value)
            }
            placeholder="Ville"
            className="w-full h-12 rounded-2xl bg-[#fffef7] border border-[#eef1d7] px-4 text-sm text-[#5f5f52] mb-4 outline-none"
          />

          <div className="flex gap-2">

            <button
              onClick={() =>
                setShowAdresseBox(false)
              }
              className="flex-1 h-11 rounded-2xl bg-[#f8f8ef] border border-[#eef1d7] text-[#8d947b]"
            >
              Plus tard
            </button>

            <button
              onClick={envoyerAdresse}
              className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-[#ffe27a] to-[#bdf59f] text-[#5f5f52] font-bold flex items-center justify-center gap-2 shadow-lg"
            >
              <MapPin className="w-4 h-4" />
              Envoyer
            </button>

          </div>
        </div>
      </div>
    )}

    {/* ✅ CONFIRM */}
    {mission?.statut === "en_cours" && (
      <div className="fixed bottom-24 left-0 right-0 px-4 z-30">
        <button
          onClick={confirmerMission}
          className="w-full py-3 rounded-[24px] bg-gradient-to-r from-[#bff7a5] to-[#fff09f] text-[#5f5f52] font-bold shadow-[0_10px_30px_rgba(220,255,170,0.4)]"
        >
          🌱 Confirmer la mission
        </button>
      </div>
    )}

    {/* ⭐ AVIS */}
    {mission?.statut === "terminee" &&
      !showAvis && (
        <div className="fixed bottom-24 left-0 right-0 px-4 z-30">
          <button
            onClick={() => setShowAvis(true)}
            className="w-full py-3 rounded-[24px] bg-gradient-to-r from-[#ffe27a] to-[#ffd9a8] text-[#6d6650] font-bold shadow-[0_10px_30px_rgba(255,220,120,0.35)]"
          >
            ⭐ Laisser un avis
          </button>
        </div>
      )}

    {/* 🌟 INPUT */}
    {!isClosed && (
      <div className="border-t border-[#eef1d7] bg-white/70 backdrop-blur-2xl px-3 py-3">

        <div className="flex items-center gap-2 bg-[#fffef8] border border-[#edf1d6] rounded-[24px] px-2 py-2 shadow-lg">

          <input
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            onKeyDown={(e) =>
              e.key === "Enter" &&
              sendMessage()
            }
            placeholder="Écris un message 🌼"
            className="flex-1 bg-transparent text-[#5f5f52] placeholder:text-[#b0b79d] outline-none px-2 text-sm"
          />

          <button
            onClick={sendMessage}
            className="w-11 h-11 rounded-2xl bg-gradient-to-r from-[#ffe27a] to-[#bdf59f] flex items-center justify-center shrink-0 shadow-md"
          >
            <Send className="w-4 h-4 text-[#5f5f52]" />
          </button>

        </div>
      </div>
    )}
  </div>
);
  export default ChatPage;
