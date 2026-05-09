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
    <div className="h-screen bg-[#071118] text-white flex flex-col overflow-hidden relative">

      {/* BG */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#06131a] via-[#071118] to-[#0a2222]" />

      <div className="absolute top-[-100px] left-[-100px] w-[250px] h-[250px] bg-cyan-400/20 blur-[100px] rounded-full -z-10" />

      <div className="absolute bottom-[-100px] right-[-100px] w-[250px] h-[250px] bg-green-400/20 blur-[100px] rounded-full -z-10" />

      {/* HEADER */}
      <div className="h-16 min-h-16 border-b border-white/10 backdrop-blur-xl bg-white/5 px-4 flex items-center gap-3 z-20">

        <button
          onClick={() => navigate("/messages")}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="flex-1 overflow-hidden">
          <p className="font-semibold truncate text-white">
            {conversation?.demande?.titre ||
              "Conversation"}
          </p>

          <p className="text-xs text-cyan-100/70">
            {isClosed
              ? "❌ Fermée"
              : mission?.statut === "terminee"
              ? "✅ Mission terminée"
              : mission?.statut === "en_cours"
              ? "💙 Mission en cours"
              : "💬 Discussion active"}
          </p>
        </div>
      </div>

      {/* MESSAGES */}
      <div
        ref={messagesRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-56"
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
              className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-lg break-words ${
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

      {/* 📍 ADRESSE */}
      {showAdresseBox && !adresseEnvoyee && (
        <div className="fixed bottom-28 left-4 right-4 z-40">

          <div className="rounded-3xl bg-[#10212a] border border-white/10 p-4 shadow-2xl backdrop-blur-xl">

            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-cyan-300" />

              <p className="font-semibold text-white">
                Envoyer ton adresse ?
              </p>
            </div>

            <p className="text-sm text-cyan-100/60 mb-4">
              Tu peux modifier l’adresse avant envoi 💙
            </p>

            <input
              value={adresse}
              onChange={(e) =>
                setAdresse(e.target.value)
              }
              placeholder="Adresse"
              className="w-full h-11 rounded-2xl bg-white/5 border border-white/10 px-4 text-sm text-white mb-3 outline-none"
            />

            <input
              value={ville}
              onChange={(e) =>
                setVille(e.target.value)
              }
              placeholder="Ville"
              className="w-full h-11 rounded-2xl bg-white/5 border border-white/10 px-4 text-sm text-white mb-4 outline-none"
            />

            <div className="flex gap-2">

              <button
                onClick={() =>
                  setShowAdresseBox(false)
                }
                className="flex-1 h-11 rounded-2xl bg-white/5 border border-white/10"
              >
                Plus tard
              </button>

              <button
                onClick={envoyerAdresse}
                className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-cyan-400 to-green-400 text-white font-semibold flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Envoyer
              </button>

            </div>
          </div>
        </div>
      )}

      {/* CONFIRM */}
      {mission?.statut === "en_cours" && (
        <div className="fixed bottom-24 left-0 right-0 px-4 z-30">
          <button
            onClick={confirmerMission}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 text-white font-semibold shadow-xl"
          >
            ✅ Confirmer la mission
          </button>
        </div>
      )}

      {/* AVIS */}
      {mission?.statut === "terminee" &&
        !showAvis && (
          <div className="fixed bottom-24 left-0 right-0 px-4 z-30">
            <button
              onClick={() => setShowAvis(true)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-semibold shadow-xl"
            >
              ⭐ Laisser un avis
            </button>
          </div>
        )}

      {/* MODAL AVIS */}
      {showAvis && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end">

          <div className="w-full rounded-t-[30px] bg-[#0d1b22] border-t border-white/10 p-5">

            <div className="w-14 h-1.5 bg-white/20 rounded-full mx-auto mb-5" />

            <h2 className="text-xl font-bold text-center mb-1">
              Laisser un avis
            </h2>

            <p className="text-sm text-center text-cyan-100/60 mb-6">
              Ton avis aide la communauté 💙
            </p>

            {/* STARS */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setNote(n)}
                >
                  <Star
                    className={`w-9 h-9 transition ${
                      n <= note
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-white/20"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* TEXTAREA */}
            <textarea
              value={commentaire}
              onChange={(e) =>
                setCommentaire(e.target.value)
              }
              placeholder="Écris ton commentaire..."
              className="w-full h-28 rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-white placeholder:text-gray-400 outline-none resize-none"
            />

            {/* BUTTONS */}
            <div className="flex gap-3 mt-5">

              <button
                onClick={() => setShowAvis(false)}
                className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-white"
              >
                Annuler
              </button>

              <button
                onClick={envoyerAvis}
                className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-semibold"
              >
                Envoyer
              </button>

            </div>
          </div>
        </div>
      )}

      {/* INPUT */}
      {!isClosed && (
        <div className="border-t border-white/10 bg-[#071118]/90 backdrop-blur-xl px-3 py-3">

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-2 py-2">

            <input
              value={text}
              onChange={(e) =>
                setText(e.target.value)
              }
              onKeyDown={(e) =>
                e.key === "Enter" &&
                sendMessage()
              }
              placeholder="Écris un message..."
              className="flex-1 bg-transparent text-white placeholder:text-gray-400 outline-none px-2 text-sm"
            />

            <button
              onClick={sendMessage}
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 flex items-center justify-center shrink-0"
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
