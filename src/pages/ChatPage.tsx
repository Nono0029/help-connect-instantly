import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "@/context/LanguageContext";
import { isUrgentActive, isBoostActive, getFeesEuros, getTotalEuros } from "@/lib/urgentFee";
import { Capacitor } from "@capacitor/core";
import { initStripe, isApplePayAvailable, payWithApplePay } from "@/lib/stripeApplePay";
import {
  ArrowLeft,
  Send,
  Star,
  MapPin,
  ShieldCheck,
  Check,
  CheckCircle2,
  X,
  Loader2,
  Image as ImageIcon,
  Lock,
  CreditCard,
  Euro,
  AlertTriangle,
  Flag,
  Wallet,
  Siren,
  Phone,
  Share2,
  Gift,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Illu } from "@/components/Illustrations";
import ImageLightbox from "@/components/ImageLightbox";
import SuccessCelebration from "@/components/SuccessCelebration";
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
  demandes?: {
    titre?: string;
    prix?: string | number | null;
    urgent?: boolean | null;
    created_at?: string | null;
  };
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
  const { t } = useTranslation();

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
  interface Payment {
    id: number;
    mission_id: number;
    statut: string;
    montant: number;
    frais: number;
    stripe_session_id: string;
    stripe_payment_intent?: string;
    released_at?: string;
    refunded_at?: string;
  }
  const [payment, setPayment] = useState<Payment | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [payTrace, setPayTrace] = useState("");
  const [payElapsed, setPayElapsed] = useState(0);
  const [isBoosted, setIsBoosted] = useState(false);
  const [isReferralExempt, setIsReferralExempt] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("boost_until, referred_by, referral_fee_used")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setIsBoosted(isBoostActive(data?.boost_until));
        setIsReferralExempt(!!data?.referred_by && !data?.referral_fee_used);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!paymentLoading) return;
    const t = setInterval(() => setPayElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [paymentLoading]);

  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [showAvis, setShowAvis] = useState(false);
  const [avisDonne, setAvisDonne] = useState(false);
  const [note, setNote] = useState(5);
  const [commentaire, setCommentaire] = useState("");
  const [celebrate, setCelebrate] = useState<{ title: string; subtitle?: string } | null>(null);

  const [showAdresseBox, setShowAdresseBox] = useState(false);
  const [adresseDismissed, setAdresseDismissed] = useState(false);
  const [adresse, setAdresse] = useState("");
  const [ville, setVille] = useState("");
  const [adresseEnvoyee, setAdresseEnvoyee] = useState(false);

  const [showSOS, setShowSOS] = useState(false);
  const [sharingPosition, setSharingPosition] = useState(false);
  const [sharingCard, setSharingCard] = useState(false);

  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  const [walletBalance, setWalletBalance] = useState<number>(0);

  const [showSignal, setShowSignal] = useState(false);
  const [signalRaison, setSignalRaison] = useState("");
  const [signalDescription, setSignalDescription] = useState("");
  const [signalPhotos, setSignalPhotos] = useState<string[]>([]);
  const [signalLoading, setSignalLoading] = useState(false);
  const signalFileRef = useRef<HTMLInputElement>(null);

  const messagesRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef(0);
  const otherUserIdRef = useRef<string | null>(null);
  const conversationRef = useRef<Conversation | null>(null);
  const missionRef = useRef<Mission | null>(null);

  const isImgMsg = (content: string) => content.startsWith("📷:");
  const isLocMsg = (content: string) => content.startsWith("📍");
  const locLabel = (content: string) => {
    const match = content.match(/^📍\s*(.*?)(?::|\n)/);
    return match ? match[1].trim() : "Localisation";
  };
  const locAddress = (content: string) => {
    const lines = content.replace(/^📍\s*[^:\n]*:\s*/, "").replace(/^📍\s*/, "").split("\n").filter(Boolean);
    return lines.join(", ");
  };
  const openLocation = (content: string) => {
    const urlMatch = content.match(/https:\/\/maps\.google\.com\/\?q=[\d.,-]+/);
    if (urlMatch) {
      window.open(urlMatch[0], "_system");
      return;
    }
    const addr = locAddress(content);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, "_system");
  };

  const allChatPhotos = useMemo(() => messages
    .filter(m => isImgMsg(m.content))
    .map(m => m.content.slice(3)), [messages]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH+JkI+LhH+AgoSFhYaGhoaHh4eIiIiJiYmJiYmJiYqKioqLi4uLi4yMjI2NjY6Ojo+Pj5CQkJGRkZKSkpKTk5OUlJSVlZWWlpaXl5eYmJiZmZmampqbm5ucnJydnaCgoKGhoaKioqOjo6SkpKWlpaampqenp6ioqKmpqaqqqqurq6ysrK2tra6urrCwsLGxsbKysrOzs7S0tLW1tba2tre3t7i4uLm5ubq6uru7u7y8vL29vb6+vr/AwMDAwcHBwsLCw8PExMTFxcXGxsbHx8fIyMjJycnKysrLy8vMzMzNzc3Ozs7Pz8/Q0NDR0dHS0tLT09PU1NTV1dXW1tbX19fY2NjZ2dna2tra29vb3Nzc3d3d3t7e39/f4ODg4eHh4uLi4+Pj5OTk5eXl5ubm5+fn6Ojo6enp6urq6+vr7Ozs7e3t7u7u7+/v8PDw8fHx8vLy8/Pz9PT09fX19vb29/f3+Pj4+fn5+vr6+/v7/Pz8/f39/v7+////AAAAAAAAAAAA');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch {}
  };

  const fetchMessages = async () => {
    if (!id) return;
    try {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", parseInt(id))
        .order("created_at", { ascending: false })
        .limit(200);
      setMessages((data || []).slice().reverse());
    } catch (err) {
      console.error("fetchMessages error:", err);
    }
  };

  const fetchConversation = async () => {
    if (!id) return;
    try {
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
      conversationRef.current = { ...conv, demande };

      if (user) {
        const otherId = user.id === conv.helper_id ? conv.demandeur_id : conv.helper_id;
        setOtherUserId(otherId);
        otherUserIdRef.current = otherId;
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
    } catch (err) {
      console.error("fetchConversation error:", err);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("adresse, ville")
        .eq("id", user.id)
        .single();
      if (data) {
        setAdresse(data.adresse || "");
        setVille(data.ville || "");
      }

      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (wallet) setWalletBalance(wallet.balance || 0);
    } catch (err) {
      console.error("fetchProfile error:", err);
    }
  };

  useEffect(() => {
    initStripe();
  }, []);

  const fetchMission = async (conv: Conversation) => {
    if (!conv) return;
    try {
      const { data } = await supabase
        .from("missions")
        .select("*, demandes(titre, prix, urgent, created_at)")
        .eq("demande_id", conv.demande_id)
        .maybeSingle();
      if (!data) {
        setMission(null);
        missionRef.current = null;
        setPayment(null);
        return;
      }

      const missionData = data as Mission;
      setMission(missionData);
      missionRef.current = missionData;

      const { data: p } = await supabase
        .from("payments")
        .select("*")
        .eq("mission_id", missionData.id)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      setPayment(p || null);

      if (user) {
        const { data: avis } = await supabase
          .from("avis")
          .select("id")
          .eq("mission_id", missionData.id)
          .eq("auteur_id", user.id)
          .maybeSingle();
        if (avis) setAvisDonne(true);
      }
    } catch (err) {
      console.error("fetchMission error:", err);
    }
  };

  const updateLastSeen = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", user.id);
  };

  const accepterMission = async () => {
    if (!conversation || !user) return;
    setActionLoading(true);

    try {
      const { error: missionErr } = await supabase.from("missions").insert({
        demande_id: conversation.demande_id,
        helper_id: conversation.helper_id,
        demandeur_id: conversation.demandeur_id,
        statut: "en_cours",
        helper_confirme: false,
        demandeur_confirme: false,
      });
      if (missionErr) throw missionErr;

      await supabase.from("conversations").update({ statut: "en_cours" }).eq("id", conversation.id);

      await supabase.from("messages").insert({
        conversation_id: parseInt(id!),
        sender_id: user.id,
        content: t('chat.missionAccepted'),
      });

      if (otherUserId) {
        await supabase.from("notifications").insert({
          user_id: otherUserId,
          message: t('chat.missionAcceptedNotif'),
          conversation_id: conversation.id,
          lu: false,
        });
      }

      fetchConversation();
      fetchMission(conversation);
    } catch (err) {
      console.error("accepterMission error:", err);
      toast.error("Erreur lors de l'acceptation de la mission");
    }
    setActionLoading(false);
  };

  const refuserMission = async () => {
    if (!conversation || !user) return;
    setActionLoading(true);

    try {
      await supabase.from("conversations").update({ statut: "fermée" }).eq("id", conversation.id);

      await supabase.from("messages").insert({
        conversation_id: parseInt(id!),
        sender_id: user.id,
        content: t('chat.missionRefused'),
      });

      if (otherUserId) {
        await supabase.from("notifications").insert({
          user_id: otherUserId,
          message: t('chat.missionRefusedNotif'),
          conversation_id: conversation.id,
          lu: false,
        });
      }

      fetchConversation();
    } catch (err) {
      console.error("refuserMission error:", err);
      toast.error("Erreur lors du refus de la mission");
    }
    setActionLoading(false);
  };

  const confirmerMission = async () => {
    if (!mission || !user) return;
    if (user.id === mission.demandeur_id && !paymentDone) {
      toast.error(t('chat.confirmMissionLocked'));
      return;
    }
    if (actionLoading) return;
    setActionLoading(true);

    try {
      const updates: any = {};
      if (user.id === mission.helper_id) updates.helper_confirme = true;
      if (user.id === mission.demandeur_id) updates.demandeur_confirme = true;

      const { error: updateErr } = await supabase.from("missions").update(updates).eq("id", mission.id);
      if (updateErr) throw updateErr;

      const helper = updates.helper_confirme ?? mission.helper_confirme;
      const demandeur = updates.demandeur_confirme ?? mission.demandeur_confirme;

      if (helper && demandeur) {
        const { error: termErr } = await supabase.from("missions").update({ statut: "terminee" }).eq("id", mission.id);
        if (termErr) throw termErr;
        await supabase.from("conversations").update({ statut: "terminee" }).eq("id", conversation?.id);

        const { error: releaseErr } = await supabase.functions.invoke("release-payment", {
          body: { mission_id: mission.id },
        });
        if (releaseErr) {
          console.error("release-payment error:", releaseErr);
          await supabase.from("notifications").insert({
            user_id: mission.helper_id,
            message: t('chat.paymentReleaseError'),
            conversation_id: parseInt(id!),
            lu: false,
          });
        }

        await supabase.from("messages").insert({
          conversation_id: parseInt(id!),
          sender_id: user.id,
          content: t('chat.missionFinishedMsg'),
        });

        setCelebrate({ title: t('chat.missionDoneTitle'), subtitle: t('chat.missionDoneSubtitle') });

        if (otherUserId) {
          await supabase.from("notifications").insert([{
            user_id: otherUserId,
            message: t('chat.missionFinishedNotif'),
            conversation_id: parseInt(id!),
            lu: false,
          }, {
            user_id: user.id,
            message: t('chat.missionFinishedThanks'),
            conversation_id: parseInt(id!),
            lu: false,
          }]);
        }
      } else if (otherUserId) {
        await supabase.from("notifications").insert({
          user_id: otherUserId,
          message: t('chat.missionConfirmed', { name: user.email?.split("@")[0] || t('chat.someone') }),
          conversation_id: parseInt(id!),
          lu: false,
        });
      }

      fetchMission(conversation);
    } catch (err) {
      console.error("confirmerMission error:", err);
      toast.error("Erreur lors de la confirmation");
    }
    setActionLoading(false);
  };

  const handlePayment = async () => {
    if (!mission || !user) return;
    setPaymentLoading(true);
    setPayElapsed(0);
    setPayTrace("1/4 Envoi au serveur…");
    console.log("[pay] 1. start", mission.id);

    try {
      if (!Capacitor.isNativePlatform()) {
        toast.error("Le paiement n'est disponible que sur l'application mobile");
        setPaymentLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const makePaymentRequest = async (): Promise<any> => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
          const res = await fetch(
            "https://tdymtslljytdihkblvwu.supabase.co/functions/v1/create-payment",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                mission_id: mission.id,
                conversation_id: conversation?.id || parseInt(id),
              }),
              signal: controller.signal,
            }
          );
          if (!res.ok) {
            const errBody = await res.json().catch(() => null);
            throw new Error(errBody?.error || `Erreur serveur (${res.status})`);
          }
          return res.json();
        } catch (err: any) {
          if (err?.name === "AbortError") {
            throw new Error("Le serveur de paiement ne répond pas. Réessaie.");
          }
          throw err;
        } finally {
          clearTimeout(timeout);
        }
      };

      let data: any;
      for (let attempt = 0; ; attempt++) {
        try {
          data = await makePaymentRequest();
          break;
        } catch (err: any) {
          const isNetwork =
            /load failed|network|internet|offline|connexion|ECONN/i.test(err?.message || "");
          if (!isNetwork || attempt >= 2) throw err;
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }

      if (!data?.clientSecret) {
        throw new Error(t("chat.paymentError"));
      }
      console.log("[pay] 2. clientSecret received, amount", data.amount);
      setPayTrace(`2/4 ClientSecret reçu (${data.amount} €)`);

      const total = data.amount as number;

      setPayTrace("3/4 Ouverture de la feuille Apple Pay…");
      const paid = await payWithApplePay(
        data.clientSecret,
        total,
        mission.demandes?.titre || "Mission"
      );
      console.log("[pay] 3. payWithApplePay resolved", paid);
      setPayTrace(paid ? "3/4 Feuille fermée : paiement réussi" : "3/4 Feuille fermée : annulé");

      if (!paid) {
        setPaymentLoading(false);
        return;
      }

      toast.success("Paiement Apple Pay effectué !");
      setCelebrate({ title: t('chat.paymentSuccessTitle'), subtitle: t('chat.paymentSuccessSubtitle') });

      const { data: p } = await supabase
        .from("payments")
        .select("*")
        .eq("mission_id", mission.id)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (p) setPayment(p);

      fetchMission(conversation);
    } catch (err: any) {
      console.error("Payment failed:", err);
      const msg = err?.message || "";
      console.log("[pay] 4. error", msg);
      setPayTrace(`4/4 Erreur : ${msg || "(aucun message)"}`);
      if (/load failed|network|internet|offline|connexion|ECONN/i.test(msg)) {
        toast.error(`Impossible de contacter le serveur de paiement. Vérifie ta connexion et réessaie. (${msg})`);
      } else {
        toast.error(msg || t("chat.paymentErrorDesc"));
      }
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
    try {
      const cibleId = user.id === mission.helper_id ? mission.demandeur_id : mission.helper_id;

      const { error } = await supabase.from("avis").insert({
        mission_id: mission.id,
        auteur_id: user.id,
        cible_id: cibleId,
        note,
        commentaire,
        verifie: mission.statut === "terminee",
      });
      if (error) throw error;

      setShowAvis(false);
      setAvisDonne(true);
      setCommentaire("");
      setNote(5);
      setCelebrate({ title: t('chat.reviewPublishedTitle'), subtitle: t('chat.reviewPublishedSubtitle') });
    } catch (err) {
      console.error("envoyerAvis error:", err);
      toast.error("Erreur lors de l'envoi de l'avis");
    }
  };

  const uploadSignalPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !id) return;
    const fileExt = file.name.split(".").pop();
    const filePath = `signal/${id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("chat-photos").upload(filePath, file);
    if (uploadError) { toast.error(t('chat.uploadError')); return; }
    const { data: urlData } = supabase.storage.from("chat-photos").getPublicUrl(filePath);
    setSignalPhotos(prev => [...prev, urlData.publicUrl]);
  };

  const handleSignal = async () => {
    if (!signalRaison || !mission || !user || !id) return;
    setSignalLoading(true);
    try {
      const reportedId = user.id === mission.helper_id ? mission.demandeur_id : mission.helper_id;
      await supabase.from("signals").insert({
        mission_id: mission.id,
        conversation_id: parseInt(id),
        reporter_id: user.id,
        reported_id: reportedId,
        raison: signalRaison,
        description: signalDescription,
        photos: signalPhotos,
        statut: "ouvert",
      });
      await supabase.from("messages").insert({
        conversation_id: parseInt(id),
        sender_id: user.id,
        content: t('chat.problemReported'),
      });
      toast.success(t('chat.reportSent'));
      setShowSignal(false);
      setSignalRaison("");
      setSignalDescription("");
      setSignalPhotos([]);
    } catch (err: any) {
      toast.error(t('chat.reportError'));
      console.error(err);
    }
    setSignalLoading(false);
  };

  const envoyerAdresse = async () => {
    if (!adresse.trim() || !user || !id) return;
    try {
      const label = isDemandeOwner ? t('chat.sendAddressDemandeur') : t('chat.sendAddress');
      await supabase.from("messages").insert({
        conversation_id: parseInt(id),
        sender_id: user.id,
        content: `📍 ${label} :\n${adresse}\n${ville}`,
      });
      setAdresseEnvoyee(true);
      setShowAdresseBox(false);
    } catch (err) {
      console.error("envoyerAdresse error:", err);
      toast.error("Erreur lors de l'envoi de l'adresse");
    }
  };

  const partagerPosition = () => {
    if (!navigator.geolocation) {
      toast.error(t('chat.sosNoGps'));
      return;
    }
    setSharingPosition(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          await supabase.from("messages").insert({
            conversation_id: parseInt(id!),
            sender_id: user.id,
            content: `${t('chat.sosLocationShared')} https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`,
          });
          toast.success(t('chat.sosLocationSent'));
        } catch (err) {
          console.error("partagerPosition error:", err);
          toast.error("Erreur lors de l'envoi de la position");
        }
        setSharingPosition(false);
      },
      () => {
        toast.error(t('chat.sosNoGps'));
        setSharingPosition(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const generateCard = (): Promise<Blob> => new Promise((resolve) => {
    const W = 1080;
    const H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#3D7A54");
    grad.addColorStop(1, "#1F4030");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.arc(W * 0.85, H * 0.15, 260, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(W * 0.1, H * 0.85, 300, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 96px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillText("Askoo", W / 2, 200);
    ctx.font = "500 40px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(t('chat.cardTagline'), W / 2, 262);

    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.45, 170, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.45 - 30, 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W / 2 - 60, H * 0.45);
    ctx.bezierCurveTo(W / 2 - 60, H * 0.45 - 60, W / 2 - 10, H * 0.45 - 55, W / 2, H * 0.45 - 25);
    ctx.bezierCurveTo(W / 2 + 10, H * 0.45 - 55, W / 2 + 60, H * 0.45 - 60, W / 2 + 60, H * 0.45);
    ctx.bezierCurveTo(W / 2 + 60, H * 0.45 + 40, W / 2, H * 0.45 + 80, W / 2, H * 0.45 + 85);
    ctx.bezierCurveTo(W / 2, H * 0.45 + 80, W / 2 - 60, H * 0.45 + 40, W / 2 - 60, H * 0.45);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 76px -apple-system, Helvetica, Arial, sans-serif";
    const cardLine = user?.id === mission?.helper_id ? t('chat.cardHelped') : t('chat.cardWasHelped');
    const line2 = t('chat.cardToday');
    ctx.fillText(cardLine, W / 2, H * 0.68);
    ctx.fillText(line2, W / 2, H * 0.76);

    ctx.font = "600 52px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(`@${otherProfile?.pseudo || user?.email?.split("@")[0] || "voisin"}`, W / 2, H * 0.84);

    ctx.font = "500 40px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText("askoo.fr", W / 2, H - 100);

    canvas.toBlob((blob) => {
      resolve(blob || new Blob());
    }, "image/png");
  });

  const partagerCarte = async () => {
    setSharingCard(true);
    try {
      const blob = await generateCard();
      const file = new File([blob], "askoo-aide.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t('chat.cardTitle'),
          text: t('chat.cardShareText'),
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "askoo-aide.png";
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t('chat.cardDownloaded'));
      }
    } catch (err) {
      console.error("partagerCarte error:", err);
    }
    setSharingCard(false);
  };

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || !user || !id) return;
    if (trimmed.length > 2000) return;
    const now = Date.now();
    if (now - lastSentRef.current < 1000) return;
    lastSentRef.current = now;

    const tempId = -now;
    setMessages(prev => [...prev, {
      id: tempId,
      conversation_id: parseInt(id),
      sender_id: user.id,
      content: trimmed,
      created_at: new Date().toISOString(),
    }]);
    setText("");

    try {
      const { data: inserted, error: msgErr } = await supabase
        .from("messages")
        .insert({
          conversation_id: parseInt(id),
          sender_id: user.id,
          content: trimmed,
        })
        .select()
        .single();
      if (msgErr) throw msgErr;
      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== tempId);
        if (inserted && withoutTemp.some(m => m.id === (inserted as Message).id)) {
          return withoutTemp;
        }
        return inserted ? [...withoutTemp, inserted as Message] : withoutTemp;
      });
      if (otherUserId) {
        await supabase.from("notifications").insert({
          user_id: otherUserId,
          message: `${user.email?.split("@")[0] || "Quelqu'un"}: ${trimmed.slice(0, 80)}${trimmed.length > 80 ? "..." : ""}`,
          conversation_id: parseInt(id),
          lu: false,
        });
      }
    } catch (err) {
      console.error("sendMessage error:", err);
      toast.error("Erreur lors de l'envoi du message");
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setText(trimmed);
    }
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
      toast.error(t('chat.photoSendError'));
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const typingSendRef = useRef<any>(null);

  const handleTyping = () => {
    if (!typingSendRef.current) {
      typingSendRef.current = supabase.channel(`typing-send-${id}`);
      typingSendRef.current.subscribe();
    }

    typingSendRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user?.id },
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (typingSendRef.current) {
        supabase.removeChannel(typingSendRef.current);
        typingSendRef.current = null;
      }
      typingTimeoutRef.current = null;
    }, 2000);
  };

  useEffect(() => {
    if (!id || !user) return;
    let mounted = true;

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
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          const next = [...prev, newMsg];
          return next.length > 200 ? next.slice(-200) : next;
        });
        if (payload.new && newMsg.sender_id !== user?.id) {
          playNotificationSound();
        }
      })
      .subscribe();

    const presenceChannel = supabase.channel(`presence-${id}`);
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const otherId = otherUserIdRef.current;
        const otherPresent = Object.values(state).some((presences: any) =>
          presences.some((p: any) => p.user_id === otherId)
        );
        setIsOnline(otherPresent);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        if (newPresences.some((p: any) => p.user_id === otherUserIdRef.current)) setIsOnline(true);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        if (leftPresences.some((p: any) => p.user_id === otherUserIdRef.current)) setIsOnline(false);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: user.id });
        }
      });

    const typingChannel = supabase.channel(`typing-${id}`);
    typingChannel
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.userId === otherUserIdRef.current) {
          setIsTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(typingChannel);
      if (typingSendRef.current) {
        supabase.removeChannel(typingSendRef.current);
        typingSendRef.current = null;
      }
      clearInterval(visibilityInterval);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [id, user?.id]);

  useEffect(() => {
    if (conversation?.id) fetchMission(conversation);
  }, [conversation?.id]);

  useEffect(() => {
    if (messages.length > 0 && messages.some(m => m.content.includes("📍"))) {
      setAdresseEnvoyee(true);
    }
  }, [messages.length]);

  const scrollToBottom = (smooth = false) => {
    requestAnimationFrame(() => {
      const el = messagesRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    });
  };

  const handleMessagesScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  };

  useEffect(() => {
    if (messages.length === 0) return;
    if (nearBottomRef.current) scrollToBottom();
  }, [messages.length]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let removeShow: (() => void) | undefined;
    let removeDidShow: (() => void) | undefined;
    let removeHide: (() => void) | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let maxKh = 0;
    let pluginHeard = false;
    const stopPoll = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = undefined;
    };
    const apply = (raw: number) => {
      maxKh = Math.max(maxKh, raw);
      setKeyboardHeight(maxKh);
      setTimeout(() => scrollToBottom(), 150);
    };
    const measure = () => {
      if (pluginHeard) return;
      const vv = window.visualViewport;
      if (vv) apply(Math.max(0, window.innerHeight - vv.height));
    };
    const startPoll = () => {
      stopPoll();
      pollTimer = setInterval(measure, 100);
      setTimeout(stopPoll, 2000);
    };
    (async () => {
      try {
        const { Keyboard } = await import("@capacitor/keyboard");
        removeShow = (await Keyboard.addListener("keyboardWillShow", (info) => {
          pluginHeard = true;
          apply(info.keyboardHeight);
          startPoll();
        })).remove;
        removeDidShow = (await Keyboard.addListener("keyboardDidShow", (info) => {
          pluginHeard = true;
          apply(info.keyboardHeight);
          startPoll();
        })).remove;
        removeHide = (await Keyboard.addListener("keyboardWillHide", () => {
          stopPoll();
          maxKh = 0;
          setKeyboardHeight(0);
          setTimeout(() => scrollToBottom(), 150);
        })).remove;
      } catch {}
    })();
    const vv = window.visualViewport;
    const update = () => {
      if (vv) measure();
    };
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    return () => {
      removeShow?.();
      removeDidShow?.();
      removeHide?.();
      stopPoll();
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let removeListener: (() => void) | undefined;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const listener = await App.addListener('appStateChange', async ({ isActive }) => {
          if (isActive && mission) {
            const { data: p } = await supabase
              .from("payments")
              .select("*")
              .eq("mission_id", mission.id)
              .order("id", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (p) setPayment(p);
          }
        });
        removeListener = () => listener.remove();
      } catch {}
    })();
    return () => { removeListener?.(); };
  }, [mission?.id]);

  useEffect(() => {
    if (messages.length >= 5 && !adresseEnvoyee && !adresseDismissed && mission?.statut === "en_cours" && isDemandeOwner) {
      setShowAdresseBox(true);
    }
  }, [messages.length, mission?.statut, isDemandeOwner, adresseEnvoyee, adresseDismissed]);

  const isMe = (senderId: string) => senderId === user?.id;
  const missionPrice = mission?.demandes?.prix
    ? parseFloat(String(mission.demandes.prix).replace(/[^0-9.,]/g, "").replace(",", "."))
    : 0;
  const missionHasStripePayment = !!mission && missionPrice > 0;
  const canPayMission =
    mission?.statut === "en_cours" &&
    isDemandeOwner &&
    missionHasStripePayment &&
    (!payment || payment.statut === "en_attente" || payment.statut === "expiré");
  const isActive = conversation?.statut !== "fermée";
  const paymentDone = !missionHasStripePayment || payment?.statut === "payé" || payment?.statut === "termine";
  const canConfirmMission = user?.id === mission?.helper_id || paymentDone;

  return (
    <div className="chat-viewport flex flex-col overflow-hidden relative bg-background text-foreground transition-colors duration-300">

      {/* DESSIN DE FOND — décoratif, ne bloque rien */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
        <Illu name={(["jardin","bricolage","cours","tech","animaux","ecoute","demenagement","nature","sports","travel","food","musique"] as const)[Number(id ?? 0) % 12]} className="w-64 h-64 opacity-[0.18]" />
      </div>

      {/* HEADER */}
      <div className="min-h-[88px] border-b border-border backdrop-blur-2xl bg-white/60 dark:bg-[#071c24]/70 px-4 pt-4 pb-3 flex items-start gap-3 z-20 shadow-card">

        <button onClick={() => navigate("/messages")} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shrink-0 shadow-card">
          <ArrowLeft className="w-5 h-5 text-accent dark:text-cyan-400" />
        </button>

        {!!mission && (
          <button
            onClick={() => setShowSignal(true)}
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shrink-0 shadow-card hover:bg-destructive/10 hover:border-destructive/30 transition-all"
            title={t('chat.signalBtn')}
          >
            <Flag className="w-4 h-4 text-destructive/70" />
          </button>
        )}

        {mission?.statut === "en_cours" && (
          <button
            onClick={() => setShowSOS(true)}
            className="w-10 h-10 rounded-full bg-card border border-destructive/30 flex items-center justify-center shrink-0 shadow-card hover:bg-destructive hover:border-destructive transition-all"
            title={t('chat.sosTitle')}
          >
            <Siren className="w-4 h-4 text-destructive" />
          </button>
        )}

        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <p
              className="font-bold truncate text-foreground text-[15px] cursor-pointer hover:text-primary transition-colors"
              onClick={() => otherUserId && navigate(`/profile/${otherUserId}`)}
            >
              {otherProfile?.pseudo || conversation?.demande?.titre || "Conversation"}
            </p>
            {isOnline && <div className="w-2 h-2 rounded-full bg-accent shrink-0 animate-pulse" title={t('chat.online')} />}
          </div>

          <p className="text-xs text-muted-foreground mt-0.5">
            {isTyping ? t('chat.typing')
            : conversation?.statut === "fermée" ? t('chat.closed')
            : conversation?.statut === "terminee" ? t('chat.missionFinished')
            : mission?.statut === "terminee" ? t('chat.missionFinished')
            : mission?.statut === "en_cours" ? t('chat.missionInProgress')
            : conversation?.statut === "en_attente" ? t('chat.waitingAcceptance')
            : t('chat.discussion')}
          </p>

          {canPayMission && (
            <div className="mt-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <p className="text-[11px] text-accent font-semibold">{t('chat.paymentUnlocked')}</p>
            </div>
          )}
        </div>
      </div>

      {/* ACCEPT / REFUSE */}
      {isDemandeOwner && conversation?.statut === "en_attente" && (
        <div className="px-4 py-3 bg-card/80 border-b border-border">
          <p className="text-sm font-semibold text-foreground mb-2">{t('chat.acceptPrompt')}</p>
          <div className="flex gap-2">
            <button onClick={refuserMission} disabled={actionLoading}
              className="flex-1 h-11 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} {t('chat.refuse')}
            </button>
            <button onClick={accepterMission} disabled={actionLoading}
              className="flex-1 h-11 rounded-2xl bg-accent/10 text-accent border border-accent/20 font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {t('chat.accept')}
            </button>
          </div>
        </div>
      )}

      {/* PAIEMENT — show if there's a price */}
      {canPayMission && (
        <div className="px-4 py-3 bg-card/80 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-accent" />
            <p className="text-sm font-semibold text-foreground">
              {payment?.statut === "en_attente" ? t('chat.paymentPending') : t('chat.paymentAvailable')}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {payment?.statut === "en_attente"
              ? t('chat.paymentPendingDesc')
              : payment?.statut === "expiré"
                ? t('chat.paymentExpiredDesc')
                : t('chat.paymentDesc')}
          </p>
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs text-muted-foreground">{t('chat.payTotal')}</span>
            <span className="text-sm font-bold text-foreground">{getTotalEuros(missionPrice, isUrgentActive(mission?.demandes?.urgent, mission?.demandes?.created_at), isBoosted, isReferralExempt).toFixed(2)} €</span>
          </div>
          {isReferralExempt && (
            <p className="text-[11px] text-accent font-semibold mb-2 flex items-center gap-1">
              <Gift className="w-3 h-3" /> {t('chat.firstRequestFree')}
            </p>
          )}
          <button
            onClick={handlePayment}
            disabled={paymentLoading}
            className="w-full h-12 rounded-2xl bg-black text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 hover:bg-gray-800"
          >
            {paymentLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            Payer avec Apple Pay
          </button>
          {paymentLoading && (
            <div className="mt-2 text-[10px] font-mono leading-tight text-muted-foreground">
              <div>{payTrace}</div>
              <div>secondes écoulées : {payElapsed}</div>
            </div>
          )}
        </div>
      )}

      {payment?.statut === "pay\u00e9" && (
        <div className="px-4 py-2 bg-accent/5 border-b border-border flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-accent" />
          <p className="text-xs text-accent font-semibold">{t('chat.paymentReceived')}</p>
        </div>
      )}

      {payment?.statut === "termine" && (
        <div className="px-4 py-2 bg-accent/5 border-b border-border flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-accent" />
          <p className="text-xs text-accent font-semibold">{t('chat.paymentReleased')}</p>
        </div>
      )}

      {payment?.statut === "rembours\u00e9" && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-border flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-destructive" />
          <p className="text-xs text-destructive font-semibold">{t('chat.paymentRefunded')}</p>
        </div>
      )}

      {/* MESSAGES */}
      <div ref={messagesRef} onScroll={handleMessagesScroll} className="chat-messages relative z-10 flex-1 overflow-y-auto px-4 py-5 space-y-3 pb-40">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <Illu name="chat" className="w-40 h-40 opacity-60" />
            <p className="text-muted-foreground text-sm mt-4">{t('chat.noMessages')}</p>
            <p className="text-muted-foreground/60 text-xs">{t('chat.noMessagesDesc')}</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-end gap-2 ${isMe(msg.sender_id) ? "justify-end" : "justify-start"}`}>
            {!isMe(msg.sender_id) && (
              <button
                onClick={() => otherUserId && navigate(`/profile/${otherUserId}`)}
                className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 hover:ring-2 hover:ring-primary/30 transition-all"
              >
                {otherProfile?.pseudo?.[0]?.toUpperCase() || "?"}
              </button>
            )}
            <div className={`flex flex-col min-w-0 max-w-[78vw] sm:max-w-sm ${isMe(msg.sender_id) ? "items-end" : "items-start"}`}>
              {isImgMsg(msg.content) ? (
                <button
                  onClick={() => setLightbox({ images: allChatPhotos, index: allChatPhotos.indexOf(msg.content.slice(3)) })}
                  className="rounded-3xl overflow-hidden border border-border shadow-soft bg-card active:scale-[0.98] transition-transform"
                >
                  <img src={msg.content.slice(3)} alt="photo" loading="lazy" className="max-h-80 w-auto max-w-[78vw] sm:max-w-sm object-cover hover:opacity-90 transition-opacity" />
                </button>
              ) : isLocMsg(msg.content) ? (
                <button
                  onClick={() => openLocation(msg.content)}
                  className="max-w-[78vw] sm:max-w-sm px-4 py-3.5 rounded-[26px] bg-card border border-border shadow-card text-left active:scale-[0.98] transition-transform hover:border-accent/50"
                >
                  <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                    <MapPin className="w-4 h-4 text-accent shrink-0" />
                    {locLabel(msg.content)}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-1 break-words">{locAddress(msg.content)}</span>
                  <span className="block text-[11px] font-semibold text-accent mt-1.5">{t('chat.openMaps')}</span>
                </button>
              ) : (
                <div className={`px-4 py-3 rounded-[26px] text-sm break-words backdrop-blur-xl transition-colors ${
                  isMe(msg.sender_id)
                    ? "bg-[linear-gradient(135deg,#4ade80_0%,#22c55e_50%,#16a34a_100%)] text-white shadow-soft rounded-br-md"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600 shadow-card rounded-bl-md"
                }`}>
                  {msg.content}
                </div>
              )}
              <span className="text-[10px] text-muted-foreground/60 mt-1 px-2">
                {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ADRESSE */}
      {showAdresseBox && !adresseEnvoyee && (
        <div className="fixed left-4 right-4 z-40" style={{ bottom: `calc(8rem + ${keyboardHeight}px)` }}>
          <div className="rounded-[30px] bg-card/80 border border-border p-5 shadow-magic backdrop-blur-2xl">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-accent dark:text-cyan-400" />
              <p className="font-bold text-foreground">{isDemandeOwner ? t('chat.whereHelp') : t('chat.yourAddress')}</p>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{isDemandeOwner ? t('chat.shareAddressDemandeur') : t('chat.shareAddressHelper')}</p>
            <input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Adresse"
              className="w-full h-12 rounded-2xl bg-background border border-border px-4 text-sm text-foreground mb-3 outline-none" />
            <input value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Ville"
              className="w-full h-12 rounded-2xl bg-background border border-border px-4 text-sm text-foreground mb-4 outline-none" />
            <div className="flex gap-2">
              <button onClick={() => { setShowAdresseBox(false); setAdresseDismissed(true); }} className="flex-1 h-11 rounded-2xl bg-muted border border-border text-muted-foreground">{t('chat.later')}</button>
              <button onClick={envoyerAdresse} className="flex-1 h-11 rounded-2xl btn-magic font-bold flex items-center justify-center gap-2">
                <MapPin className="w-4 h-4" /> {t('chat.send')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM */}
      {mission?.statut === "en_cours" && (
        <div className="fixed left-0 right-0 px-4 z-30" style={{ bottom: `calc(8rem + ${keyboardHeight}px)` }}>
          <button
            onClick={() => canConfirmMission && setShowConfirmMission(true)}
            disabled={!canConfirmMission}
            title={!canConfirmMission ? t('chat.confirmMissionLocked') : undefined}
            className={`w-full py-3 rounded-[24px] font-bold ${
              canConfirmMission
                ? "btn-magic"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {!canConfirmMission
              ? t('chat.confirmMissionLocked')
              : user?.id === mission.helper_id
                ? (mission.helper_confirme ? t('chat.confirmMissionWaitingDemandeur') : t('chat.confirmMissionHelper'))
                : (mission.demandeur_confirme ? t('chat.confirmMissionWaitingHelper') : t('chat.confirmMissionDemandeur'))
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
                <h3 className="font-bold text-lg text-foreground">{t('chat.confirmTitle')}</h3>
              </div>

              <div className="bg-muted/50 rounded-2xl p-4 space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent shrink-0" /> <strong>{t('chat.confirmDone')}</strong></p>
                <p className="flex items-center gap-2"><Lock className="w-4 h-4 text-accent shrink-0" /> <strong>{t('chat.confirmEscrow')}</strong></p>
                <p className="flex items-center gap-2"><Euro className="w-4 h-4 text-accent shrink-0" /> <strong>{t('chat.confirmFees')}</strong></p>
                <p className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-accent shrink-0" /> <strong>{t('chat.confirmProtection')}</strong></p>
                <p className="text-xs text-muted-foreground/60 pt-1">{t('chat.confirmSmall')}</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowConfirmMission(false)}
                  className="flex-1 h-12 rounded-2xl bg-muted border border-border text-muted-foreground font-medium"
                >
                  {t('chat.confirmNo')}
                </button>
                <button
                  onClick={async () => {
                    if (actionLoading) return;
                    setShowConfirmMission(false);
                    await confirmerMission();
                  }}
                  disabled={actionLoading}
                  className="flex-1 h-12 rounded-2xl bg-accent text-accent-foreground font-bold disabled:opacity-60"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t('chat.confirmYes')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AVIS */}
      {mission?.statut === "terminee" && !showAvis && !avisDonne && (
        <div className="fixed left-0 right-0 px-4 z-30 space-y-2" style={{ bottom: `calc(8rem + ${keyboardHeight}px)` }}>
          <button onClick={() => setShowAvis(true)} className="w-full py-3 rounded-[24px] btn-magic font-bold">{t('chat.leaveReview')}</button>
          <button onClick={partagerCarte} disabled={sharingCard} className="w-full py-3 rounded-[24px] bg-card border border-border font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {sharingCard ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            {t('chat.shareCard')}
          </button>
        </div>
      )}
      {mission?.statut === "terminee" && avisDonne && (
        <div className="fixed left-0 right-0 px-4 z-30 space-y-2" style={{ bottom: `calc(8rem + ${keyboardHeight}px)` }}>
          <div className="w-full py-3 rounded-[24px] bg-muted border border-border text-center text-sm text-muted-foreground font-medium">{t('chat.reviewDone')}</div>
          <button onClick={partagerCarte} disabled={sharingCard} className="w-full py-3 rounded-[24px] bg-card border border-border font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {sharingCard ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            {t('chat.shareCard')}
          </button>
        </div>
      )}

      {showAvis && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-end">
          <div className="w-full rounded-t-[34px] bg-card border-t border-border p-5 shadow-magic">
            <div className="w-16 h-1.5 bg-muted rounded-full mx-auto mb-5" />
            <h2 className="text-xl font-bold text-center text-foreground mb-1">{t('chat.reviewTitle')}</h2>
            <p className="text-sm text-center text-muted-foreground mb-6">{t('chat.reviewSubtitle')}</p>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setNote(n)}>
                  <Star className={`w-9 h-9 transition ${n <= note ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
              placeholder={t('chat.reviewPlaceholder')}
              className="w-full h-28 rounded-3xl bg-background border border-border p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none" />
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAvis(false)} className="flex-1 h-12 rounded-2xl bg-muted border border-border text-muted-foreground">{t('chat.cancel')}</button>
              <button onClick={envoyerAvis} className="flex-1 h-12 rounded-2xl btn-magic font-bold">{t('chat.sendReview')}</button>
            </div>
          </div>
        </div>
      )}

      {/* SIGNAL */}
      <AnimatePresence>
        {showSignal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50"
            onClick={() => setShowSignal(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full p-6 rounded-t-3xl space-y-4 max-w-lg mx-auto max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto" />

              <div className="flex items-center gap-3 pt-2">
                <AlertTriangle className="w-8 h-8 text-destructive shrink-0" />
                <h3 className="font-bold text-lg text-foreground">{t('chat.reportTitle')}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{t('chat.reportDesc')}</p>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{t('chat.reportReasonLabel')}</label>
                <select
                  value={signalRaison}
                  onChange={(e) => setSignalRaison(e.target.value)}
                  className="w-full h-12 rounded-2xl bg-background border border-border px-4 text-sm text-foreground outline-none"
                >
                  <option value="">{t('chat.reportSelectReason')}</option>
                  <option value="no_show">{t('chat.reportNoShow')}</option>
                  <option value="incomplete">{t('chat.reportIncomplete')}</option>
                  <option value="bad_behavior">{t('chat.reportBadBehavior')}</option>
                  <option value="scam">{t('chat.reportScam')}</option>
                  <option value="other">{t('chat.reportOther')}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{t('chat.reportDescLabel')}</label>
                <textarea
                  value={signalDescription}
                  onChange={(e) => setSignalDescription(e.target.value)}
                  placeholder={t('chat.reportDescPlaceholder')}
                  className="w-full h-24 rounded-3xl bg-background border border-border p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{t('chat.reportPhotosLabel')}</label>
                <input ref={signalFileRef} type="file" accept="image/*" className="hidden" onChange={uploadSignalPhoto} />
                <button
                  onClick={() => signalFileRef.current?.click()}
                  className="h-11 rounded-2xl bg-background border border-border px-4 text-sm text-muted-foreground flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" /> {t('chat.reportAddPhoto')}
                </button>
                {signalPhotos.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {signalPhotos.map((url, i) => (
                      <img key={i} src={url} alt="" className="w-16 h-16 rounded-xl object-cover" />
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-destructive/5 rounded-2xl p-3 text-xs text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive/70 shrink-0" /> {t('chat.reportWarning')}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setShowSignal(false); setSignalRaison(""); setSignalDescription(""); setSignalPhotos([]); }}
                  className="flex-1 h-12 rounded-2xl bg-muted border border-border text-muted-foreground font-medium"
                >
                  {t('chat.cancel')}
                </button>
                <button
                  onClick={handleSignal}
                  disabled={!signalRaison || signalLoading}
                  className="flex-1 h-12 rounded-2xl bg-destructive text-destructive-foreground font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {signalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                  {t('chat.reportBtn')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SOS */}
      <AnimatePresence>
        {showSOS && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50"
            onClick={() => setShowSOS(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full p-6 pb-[calc(env(safe-area-inset-bottom)+20px)] rounded-t-3xl space-y-4 max-w-lg mx-auto"
            >
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto" />
              <div className="flex items-center gap-3 pt-1">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <Siren className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">{t('chat.sosTitle')}</h3>
                  <p className="text-xs text-muted-foreground">{t('chat.sosDesc')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[{ n: "15", label: t('chat.sosSamu') }, { n: "17", label: t('chat.sosPolice') }, { n: "18", label: t('chat.sosPompiers') }, { n: "112", label: t('chat.sosEurope') }].map(c => (
                  <a
                    key={c.n}
                    href={`tel:${c.n}`}
                    className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-destructive/10 border border-destructive/25 text-destructive font-bold"
                  >
                    <Phone className="w-4 h-4" /> {c.n}
                    <span className="text-xs font-medium text-destructive/70">{c.label}</span>
                  </a>
                ))}
              </div>

              <div className="rounded-2xl bg-muted border border-border p-4">
                <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-accent" /> {t('chat.sosLocationTitle')}
                </p>
                <p className="text-xs text-muted-foreground mb-3">{t('chat.sosLocationDesc')}</p>
                <button
                  onClick={partagerPosition}
                  disabled={sharingPosition}
                  className="w-full h-12 rounded-2xl btn-magic font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {sharingPosition ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  {sharingPosition ? t('chat.sosSending') : t('chat.sosShareLocation')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INPUT */}
      {isActive && (
        <div className="fixed left-0 right-0 z-30 bg-background px-3 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)] border-t border-border shadow-[0_-8px_24px_rgba(0,0,0,0.06)]"
          style={{ bottom: keyboardHeight }}>
          <div className="flex items-center gap-2 bg-card border border-border rounded-full px-2 py-1.5 shadow-card">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={sendPhoto} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 active:scale-95 transition-transform disabled:opacity-50"
              title={t('chat.photoTitle')}
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <ImageIcon className="w-5 h-5 text-foreground/80" />}
            </button>
            <button
              onClick={() => { setShowAdresseBox(true); setAdresseDismissed(false); }}
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-colors ${
                adresseEnvoyee ? "bg-accent/15 text-accent" : "bg-secondary text-foreground/80"
              }`}
              title={adresseEnvoyee ? t('chat.addressSent') : isDemandeOwner ? t('chat.shareAddress') : t('chat.sendMyAddress')}
            >
              <MapPin className="w-5 h-5" />
            </button>
            <input value={text} onChange={(e) => { setText(e.target.value); handleTyping(); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={t('chat.messagePlaceholder')}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="sentences"
              enterKeyHint="send"
              inputMode="text"
              className="flex-1 min-w-0 bg-transparent text-foreground placeholder:text-muted-foreground outline-none px-2 text-base" />
            <button
              onClick={sendMessage}
              disabled={!text.trim()}
              className="w-11 h-11 rounded-full btn-magic flex items-center justify-center shrink-0 disabled:opacity-50 active:scale-95 transition-all"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onPrev={lightbox.index > 0 ? () => setLightbox(prev => prev ? { ...prev, index: prev.index - 1 } : null) : undefined}
          onNext={lightbox.index < lightbox.images.length - 1 ? () => setLightbox(prev => prev ? { ...prev, index: prev.index + 1 } : null) : undefined}
        />
      )}

      <SuccessCelebration
        open={!!celebrate}
        title={celebrate?.title}
        subtitle={celebrate?.subtitle}
        onClose={() => setCelebrate(null)}
      />
    </div>
  );
};

export default ChatPage;
