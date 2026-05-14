import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Star,
  MapPin,
  ShieldCheck,
  Check,
  X,
  Loader2,
  Image as ImageIcon,
  Lock,
  CreditCard,
  Home,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Illu } from "@/components/Illustrations";
import { toast } from "sonner";

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
    user_id?: string;
  };
}

interface Mission {
  id: number;
  demande_id: number;
  helper_id: string;
  demandeur_id: string;
  statut: string;
  helper_confirme: boolean;
  demandeur_confirme: boolean;
}

interface Profile {
  id: string;
  pseudo: string;
  avatar_url: string;
  last_seen?: string;
}

const ChatPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const paymentParam = searchParams.get("payment");
  const navigate = useNavigate();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [mission, setMission] = useState<Mission | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isDemandeOwner, setIsDemandeOwner] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirmMission, setShowConfirmMission] = useState(false);
  const [payment, setPayment] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);

  const [showAvis, setShowAvis] = useState(false);
  const [avisDonne, setAvisDonne] = useState(false);
  const [note, setNote] = useState(5);
  const [commentaire, setCommentaire] = useState("");

  const [showAdresseBox, setShowAdresseBox] = useState(false);
  const [adresseDismissed, setAdresseDismissed] = useState(false);
  const [adresse, setAdresse] = useState("");
  const [ville, setVille] = useState("");
  const [adresseEnvoyee, setAdresseEnvoyee] = useState(false);

  const messagesRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef(0);

  const isImgMsg = (content: string) => content.startsWith("📷:");

  const fetchMessages = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", parseInt(id))
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

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
      .select("titre, user_id")
      .eq("id", conv.demande_id)
      .single();

    setConversation({ ...conv, demande });

    if (user) {
      const otherId = user.id === conv.helper_id ? conv.demandeur_id : conv.helper_id;
      setOtherUserId(otherId);
      setIsDemandeOwner(user.id === demande?.user_id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, pseudo, avatar_url, last_seen")
        .eq("id", otherId)
        .single();
      if (profile) {
        setOtherProfile(profile);
        if (profile.last_seen) {
          const diff = Date.now() - new Date(profile.last_seen).getTime();
          setIsOnline(diff < 120000);
        }
      }
    }
  };

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

  const fetchMission = async (conv: any) => {
    if (!conv) return;
    const { data } = await supabase
      .from("missions")
      .select("*")
      .eq("demande_id", conv.demande_id)
      .maybeSingle();
    if (data) setMission(data as Mission);

    const { data: p } = await supabase
      .from("payments")
      .select("*")
      .eq("mission_id", data?.id)
      .maybeSingle();
    if (p) setPayment(p);

    if (user && data) {
      const { data: avis } = await supabase
        .from("avis")
        .select("id")
        .eq("mission_id", data.id)
        .eq("auteur_id", user.id)
        .maybeSingle();
      if (avis) setAvisDonne(true);
    }
  };

  const updateLastSeen = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", user.id);
  };

  const accepterMission = async () => {
    if (!conversation || !user) return;
    setActionLoading(true);

    await supabase.from("missions").insert({
      demande_id: conversation.demande_id,
      helper_id: conversation.helper_id,
      demandeur_id: conversation.demandeur_id,
      statut: "en_cours",
      helper_confirme: false,
      demandeur_confirme: false,
    });

    await supabase.from("conversations").update({ statut: "en_cours" }).eq("id", conversation.id);

    await supabase.from("messages").insert({
      conversation_id: parseInt(id!),
      sender_id: user.id,
      content: "✅ Mission acceptée ! Prépare-toi à aider 🌱",
    });

    if (otherUserId) {
      await supabase.from("notifications").insert({
        user_id: otherUserId,
        message: "✅ Ta demande d'aide a été acceptée !",
        conversation_id: conversation.id,
        lu: false,
      });
    }

    fetchConversation();
    fetchMission(conversation);
    setActionLoading(false);
  };

  const refuserMission = async () => {
    if (!conversation || !user) return;
    setActionLoading(true);

    await supabase.from("conversations").update({ statut: "fermée" }).eq("id", conversation.id);

    await supabase.from("messages").insert({
      conversation_id: parseInt(id!),
      sender_id: user.id,
      content: "❌ Demande refusée. Désolé !",
    });

    if (otherUserId) {
      await supabase.from("notifications").insert({
        user_id: otherUserId,
        message: "❌ Ta demande d'aide a été refusée.",
        conversation_id: conversation.id,
        lu: false,
      });
    }

    fetchConversation();
    setActionLoading(false);
  };

  const confirmerMission = async () => {
    if (!mission || !user) return;

    const updates: any = {};
    if (user.id === mission.helper_id) updates.helper_confirme = true;
    if (user.id === mission.demandeur_id) updates.demandeur_confirme = true;

    await supabase.from("missions").update(updates).eq("id", mission.id);

    const helper = updates.helper_confirme ?? mission.helper_confirme;
    const demandeur = updates.demandeur_confirme ?? mission.demandeur_confirme;

    if (helper && demandeur) {
      await supabase.from("missions").update({ statut: "terminee" }).eq("id", mission.id);
      await supabase.from("conversations").update({ statut: "terminee" }).eq("id", conversation?.id);

      await supabase.from("messages").insert({
        conversation_id: parseInt(id!),
        sender_id: user.id,
        content: "🎉 Mission terminée ! Merci à tous les deux !",
      });

      if (otherUserId) {
        await supabase.from("notifications").insert([{
          user_id: otherUserId,
          message: "🎉 Mission terminée ! Les deux parties ont confirmé.",
          conversation_id: parseInt(id!),
          lu: false,
        }, {
          user_id: user.id,
          message: "🎉 Mission terminée ! Merci pour ton aide.",
          conversation_id: parseInt(id!),
          lu: false,
        }]);
      }
    } else if (otherUserId) {
      await supabase.from("notifications").insert({
        user_id: otherUserId,
        message: `${user.email?.split("@")[0] || "Quelqu'un"} a confirmé la mission ✅`,
        conversation_id: parseInt(id!),
        lu: false,
      });
    }

    fetchMission(conversation);
  };

  const handlePayment = async () => {
    if (!mission || !user) return;
    setPaymentLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { mission_id: mission.id, user_id: user.id, conversation_id: id },
      });

      if (error || !data?.url) throw new Error(error?.message || "Erreur paiement");

      const { data: p } = await supabase
        .from("payments")
        .select("*")
        .eq("mission_id", mission.id)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (p) setPayment(p);

      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err?.message || "Erreur de paiement. Vérifie que le prestataire a configuré Stripe.");
      console.error(err);
    }

    setPaymentLoading(false);
  };

  useEffect(() => {
    if (paymentParam === "success" && mission && conversation) {
      fetchMission(conversation);
      navigate(`/chat/${id}`, { replace: true });
    }
  }, [paymentParam, mission?.id, conversation?.id]);

  const envoyerAvis = async () => {
    if (!mission || !user) return;
    const cibleId = user.id === mission.helper_id ? mission.demandeur_id : mission.helper_id;

    await supabase.from("avis").insert({
      mission_id: mission.id,
      auteur_id: user.id,
      cible_id: cibleId,
      note,
      commentaire,
    });

    setShowAvis(false);
    setAvisDonne(true);
    setCommentaire("");
    setNote(5);
  };

  const envoyerAdresse = async () => {
    if (!adresse.trim()) return;
    const label = isDemandeOwner ? "📍 Où venir m'aider" : "📍 Mon adresse";
    await supabase.from("messages").insert({
      conversation_id: parseInt(id!),
      sender_id: user?.id,
      content: `${label} :\n${adresse}\n${ville}`,
    });
    setAdresseEnvoyee(true);
    setShowAdresseBox(false);
  };

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || !user || !id) return;
    if (trimmed.length > 2000) return;
    const now = Date.now();
    if (now - lastSentRef.current < 1000) return;
    lastSentRef.current = now;
    await supabase.from("messages").insert({
      conversation_id: parseInt(id),
      sender_id: user.id,
      content: trimmed,
    });
    if (otherUserId) {
      await supabase.from("notifications").insert({
        user_id: otherUserId,
        message: `${user.email?.split("@")[0] || "Quelqu'un"}: ${trimmed.slice(0, 80)}${trimmed.length > 80 ? "..." : ""}`,
        conversation_id: parseInt(id),
        lu: false,
      });
    }
    setText("");
  };

  const sendPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !id) return;
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `chat/${id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("chat-photos").getPublicUrl(filePath);

      await supabase.from("messages").insert({
        conversation_id: parseInt(id),
        sender_id: user.id,
        content: `📷:${urlData.publicUrl}`,
      });
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de l'envoi de la photo");
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleTyping = () => {
    if (!typingTimeoutRef.current) {
      supabase.channel(`typing-${id}`).send({
        type: "broadcast",
        event: "typing",
        payload: { userId: user?.id },
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 2000);
  };

  useEffect(() => {
    if (!id || !user) return;

    fetchConversation();
    fetchMessages();
    fetchProfile();
    updateLastSeen();

    const visibilityInterval = setInterval(updateLastSeen, 60000);

    const msgChannel = supabase
      .channel(`chat-${id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${id}`,
      }, () => { fetchMessages(); })
      .subscribe();

    const convChannel = supabase
      .channel(`conv-${id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "conversations",
        filter: `id=eq.${id}`,
      }, () => { fetchConversation(); })
      .subscribe();

    const presenceChannel = supabase.channel(`presence-${id}`);
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const otherPresent = Object.values(state).some((presences: any) =>
          presences.some((p: any) => p.user_id === otherUserId)
        );
        setIsOnline(otherPresent);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        if (newPresences.some((p: any) => p.user_id === otherUserId)) setIsOnline(true);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        if (leftPresences.some((p: any) => p.user_id === otherUserId)) setIsOnline(false);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: user.id });
        }
      });

    const typingChannel = supabase.channel(`typing-${id}`);
    typingChannel
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.userId === otherUserId) {
          setIsTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
        }
      })
      .subscribe();

    const paymentChannel = supabase
      .channel(`payment-${id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "payments",
      }, (payload) => {
        const p = payload.new as any;
        if (conversation && p?.mission_id === mission?.id) {
          setPayment(p);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(convChannel);
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(typingChannel);
      supabase.removeChannel(paymentChannel);
      clearInterval(visibilityInterval);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [id, user]);

  useEffect(() => {
    if (conversation) fetchMission(conversation);
  }, [conversation]);

  useEffect(() => {
    if (messages.find(m => m.content.includes("📍"))) {
      setAdresseEnvoyee(true);
    }
  }, [messages]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length >= 5 && !adresseEnvoyee && !adresseDismissed && mission?.statut === "en_cours" && isDemandeOwner) {
      setShowAdresseBox(true);
    }
  }, [messages, mission, isDemandeOwner]);

  const isMe = (senderId: string) => senderId === user?.id;
  const isActive = conversation?.statut !== "fermée";

  return (
    <div className="h-screen flex flex-col overflow-hidden relative bg-background text-foreground transition-colors duration-300">

      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-pastel-soft via-background to-background dark:from-[#06131a] dark:via-[#071c24] dark:to-[#06131a]" />
      <div className="absolute top-[-120px] left-[-120px] w-[260px] h-[260px] bg-pastel-yellow/30 dark:bg-cyan-500/10 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-[-120px] right-[-120px] w-[260px] h-[260px] bg-pastel-green/30 dark:bg-emerald-500/10 blur-[120px] rounded-full -z-10" />

      {/* HEADER */}
      <div className="min-h-[88px] border-b border-border backdrop-blur-2xl bg-white/60 dark:bg-[#071c24]/70 px-4 pt-4 pb-3 flex items-start gap-3 z-20 shadow-card">

        <button onClick={() => navigate("/messages")} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shrink-0 shadow-card">
          <ArrowLeft className="w-5 h-5 text-accent dark:text-cyan-400" />
        </button>

        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <p
              className="font-bold truncate text-foreground text-[15px] cursor-pointer hover:text-primary transition-colors"
              onClick={() => otherUserId && navigate(`/profile/${otherUserId}`)}
            >
              {otherProfile?.pseudo || conversation?.demande?.titre || "Conversation"}
            </p>
            {isOnline && <div className="w-2 h-2 rounded-full bg-accent shrink-0 animate-pulse" title="En ligne" />}
          </div>

          <p className="text-xs text-muted-foreground mt-0.5">
            {isTyping ? "🤔 En train d'écrire..."
            : conversation?.statut === "fermée" ? "❌ Conversation fermée"
            : conversation?.statut === "terminee" ? "⭐ Mission terminée"
            : mission?.statut === "terminee" ? "⭐ Mission terminée"
            : mission?.statut === "en_cours" ? "🌱 Mission en cours"
            : conversation?.statut === "en_attente" ? "⏳ En attente d'acceptation"
            : "💬 Discussion"}
          </p>

          {messages.length >= 5 && mission?.statut === "en_cours" && (
            <div className="mt-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <p className="text-[11px] text-accent font-semibold">Paiement sécurisé débloqué ✨</p>
            </div>
          )}
        </div>
      </div>

      {/* ACCEPT / REFUSE */}
      {isDemandeOwner && conversation?.statut === "en_attente" && (
        <div className="px-4 py-3 bg-card/80 border-b border-border">
          <p className="text-sm font-semibold text-foreground mb-2">Tu souhaites accepter cette aide ?</p>
          <div className="flex gap-2">
            <button onClick={refuserMission} disabled={actionLoading}
              className="flex-1 h-11 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Refuser
            </button>
            <button onClick={accepterMission} disabled={actionLoading}
              className="flex-1 h-11 rounded-2xl bg-accent/10 text-accent border border-accent/20 font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Accepter
            </button>
          </div>
        </div>
      )}

      {/* PAIEMENT */}
      {mission?.statut === "en_cours" && isDemandeOwner && (!payment || payment?.statut === "en_attente") && (
        <div className="px-4 py-3 bg-card/80 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-accent" />
            <p className="text-sm font-semibold text-foreground">
              {payment?.statut === "en_attente" ? "Paiement en attente" : messages.length >= 5 ? "Paiement sécurisé débloqué" : "Paiement sécurisé"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {payment?.statut === "en_attente"
              ? "Un paiement précédent n'a pas été complété. Tu peux réessayer."
              : messages.length >= 5
                ? "Le paiement est bloqué jusqu'à confirmation de la mission. Total : prix + 2€ de frais."
                : "💬 Envoie au moins 5 messages pour débloquer le paiement sécurisé."}
          </p>
          <button
            onClick={handlePayment}
            disabled={paymentLoading || messages.length < 5}
            className={`w-full h-11 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              messages.length >= 5
                ? "btn-magic"
                : "bg-muted border border-border text-muted-foreground cursor-not-allowed"
            }`}
          >
            {paymentLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            {messages.length >= 5 ? "Payer avec Stripe 💳" : `🔒 ${5 - messages.length} messages restants`}
          </button>
        </div>
      )}

      {payment?.statut === "payé" && (
        <div className="px-4 py-2 bg-accent/5 border-b border-border flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-accent" />
          <p className="text-xs text-accent font-semibold">✅ Paiement sécurisé reçu — fonds bloqués jusqu'à confirmation</p>
        </div>
      )}

      {/* ILLU BANNER */}
      <div className="flex justify-center py-3 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
        <Illu name={["jardin","bricolage","cours","tech","animaux","ecoute","demenagement","nature","sports","travel","food","musique"][Number(id ?? 0) % 12]} className="w-32 h-32 opacity-40" />
      </div>

      {/* MESSAGES */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-3 pb-56">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <Illu name="chat" className="w-40 h-40 opacity-60" />
            <p className="text-muted-foreground text-sm mt-4">Aucun message pour l'instant</p>
            <p className="text-muted-foreground/60 text-xs">Envoie un message pour commencer la discussion 🌱</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-end gap-2 ${isMe(msg.sender_id) ? "justify-end" : "justify-start"}`}>
            {!isMe(msg.sender_id) && (
              <button
                onClick={() => otherUserId && navigate(`/profile/${otherUserId}`)}
                className="w-7 h-7 rounded-full bg-accent/10 text-accent dark:text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0 hover:ring-2 hover:ring-accent/50 transition-all"
              >
                {otherProfile?.pseudo?.[0]?.toUpperCase() || "?"}
              </button>
            )}
            <div className={`max-w-[78%] px-4 py-3 rounded-[26px] text-sm break-words backdrop-blur-xl transition-colors ${
              isMe(msg.sender_id)
                ? "bg-magic-gradient dark:bg-[linear-gradient(135deg,#00b4d8_0%,#00c875_100%)] text-foreground dark:text-white shadow-soft"
                : "bg-white/75 dark:bg-[#0d2530]/80 border border-border text-foreground dark:text-cyan-50 shadow-card"
            }`}>
              {isImgMsg(msg.content) ? (
                <img src={msg.content.slice(3)} alt="photo" className="rounded-xl max-w-full max-h-64 object-cover" loading="lazy" />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ADRESSE */}
      {showAdresseBox && !adresseEnvoyee && (
        <div className="fixed bottom-28 left-4 right-4 z-40">
          <div className="rounded-[30px] bg-card/80 border border-border p-5 shadow-magic backdrop-blur-2xl">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-accent dark:text-cyan-400" />
              <p className="font-bold text-foreground">{isDemandeOwner ? "Où venir t'aider ?" : "Ton adresse ?"}</p>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{isDemandeOwner ? "Partage l'adresse où tu as besoin d'aide 🌼" : "Tu peux partager ton adresse si besoin 🌼"}</p>
            <input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Adresse"
              className="w-full h-12 rounded-2xl bg-background border border-border px-4 text-sm text-foreground mb-3 outline-none" />
            <input value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Ville"
              className="w-full h-12 rounded-2xl bg-background border border-border px-4 text-sm text-foreground mb-4 outline-none" />
            <div className="flex gap-2">
              <button onClick={() => { setShowAdresseBox(false); setAdresseDismissed(true); }} className="flex-1 h-11 rounded-2xl bg-muted border border-border text-muted-foreground">Plus tard</button>
              <button onClick={envoyerAdresse} className="flex-1 h-11 rounded-2xl btn-magic font-bold flex items-center justify-center gap-2">
                <MapPin className="w-4 h-4" /> Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM */}
      {mission?.statut === "en_cours" && (
        <div className="fixed bottom-24 left-0 right-0 px-4 z-30">
          <button onClick={() => setShowConfirmMission(true)} className="w-full py-3 rounded-[24px] btn-magic font-bold">
            {user?.id === mission.helper_id
              ? (mission.helper_confirme ? "✅ En attente de confirmation du demandeur" : "🌱 Confirmer la mission")
              : (mission.demandeur_confirme ? "✅ En attente de confirmation de l'helper" : "🌱 Confirmer la mission")
            }
          </button>
        </div>
      )}

      {/* CONFIRM MISSION POPUP */}
      <AnimatePresence>
        {showConfirmMission && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50"
            onClick={() => setShowConfirmMission(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full p-6 rounded-t-3xl space-y-4 max-w-lg mx-auto"
            >
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto" />

              <div className="flex items-center gap-3 pt-2">
                <ShieldCheck className="w-8 h-8 text-accent shrink-0" />
                <h3 className="font-bold text-lg text-foreground">Confirmer la mission ?</h3>
              </div>

              <div className="bg-muted/50 rounded-2xl p-4 space-y-2 text-sm text-muted-foreground">
                <p>✅ <strong>La mission est terminée</strong> — tout s'est bien passé ?</p>
                <p>🔒 <strong>Paiement sécurisé</strong> — les fonds sont bloqués sur Stripe et seront reversés au prestataire une fois confirmé.</p>
                <p>💰 <strong>Frais de service</strong> — 2€ prélevés par la plateforme.</p>
                <p className="text-xs text-muted-foreground/60 pt-1">En confirmant, tu libères le paiement et la mission passe en "terminée".</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowConfirmMission(false)}
                  className="flex-1 h-12 rounded-2xl bg-muted border border-border text-muted-foreground font-medium"
                >
                  Non
                </button>
                <button
                  onClick={async () => {
                    setShowConfirmMission(false);
                    await confirmerMission();
                  }}
                  className="flex-1 h-12 rounded-2xl bg-accent text-accent-foreground font-bold"
                >
                  Oui, tout est bon !
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AVIS */}
      {mission?.statut === "terminee" && !showAvis && !avisDonne && (
        <div className="fixed bottom-24 left-0 right-0 px-4 z-30">
          <button onClick={() => setShowAvis(true)} className="w-full py-3 rounded-[24px] btn-magic font-bold">⭐ Laisser un avis</button>
        </div>
      )}
      {mission?.statut === "terminee" && avisDonne && (
        <div className="fixed bottom-24 left-0 right-0 px-4 z-30">
          <div className="w-full py-3 rounded-[24px] bg-muted border border-border text-center text-sm text-muted-foreground font-medium">⭐ Avis laissé — merci !</div>
        </div>
      )}

      {showAvis && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-end">
          <div className="w-full rounded-t-[34px] bg-card border-t border-border p-5 shadow-magic">
            <div className="w-16 h-1.5 bg-muted rounded-full mx-auto mb-5" />
            <h2 className="text-xl font-bold text-center text-foreground mb-1">Laisser un avis ✨</h2>
            <p className="text-sm text-center text-muted-foreground mb-6">Ton avis aide la communauté 🌼</p>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setNote(n)}>
                  <Star className={`w-9 h-9 transition ${n <= note ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Écris ton commentaire 🌸"
              className="w-full h-28 rounded-3xl bg-background border border-border p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none" />
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAvis(false)} className="flex-1 h-12 rounded-2xl bg-muted border border-border text-muted-foreground">Annuler</button>
              <button onClick={envoyerAvis} className="flex-1 h-12 rounded-2xl btn-magic font-bold">Envoyer ✨</button>
            </div>
          </div>
        </div>
      )}

      {/* INPUT */}
      {isActive && (
        <div className="border-t border-border bg-card/70 backdrop-blur-2xl px-3 py-3">
          <div className="flex items-center gap-2 bg-background border border-border rounded-[24px] px-2 py-2 shadow-card">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={sendPhoto} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <ImageIcon className="w-4 h-4 text-muted-foreground" />}
            </button>
            <button
              onClick={() => { setShowAdresseBox(true); setAdresseDismissed(false); }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                adresseEnvoyee ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground hover:text-accent"
              }`}
              title={adresseEnvoyee ? "Adresse déjà envoyée" : isDemandeOwner ? "Partager mon adresse" : "Envoyer mon adresse"}
            >
              <Home className="w-4 h-4" />
            </button>
            <input value={text} onChange={(e) => { setText(e.target.value); handleTyping(); }}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Écris un message 🌼"
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none px-2 text-sm" />
            <button onClick={sendMessage} className="w-11 h-11 rounded-2xl btn-magic flex items-center justify-center shrink-0">
              <Send className="w-4 h-4 text-foreground dark:text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;