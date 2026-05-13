import { motion } from "framer-motion";

// Couleurs du thème
const skin = "#FFD5B8";
const skinDark = "#E8BFA0";
const hair1 = "#5C4033";
const hair2 = "#2D1B0E";
const shirt1 = "#6C63FF";
const shirt2 = "#00C875";
const pants1 = "#4A44CC";
const pants2 = "#00985A";
const shoe = "#333";
const bgCircle = "fill-primary/8";

// ─── Aide / Deux personnes qui interagissent ──────
export const HelpingScene = ({ className = "w-72 h-72" }: { className?: string }) => (
  <motion.svg viewBox="0 0 400 320" fill="none" className={className}
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
    {/* Fond */}
    <ellipse cx="200" cy="280" rx="170" ry="18" className="fill-primary/5" />
    <circle cx="100" cy="200" r="100" className="fill-primary/5" />
    <circle cx="310" cy="180" r="90" className="fill-accent/5" />

    {/* ─── Personnage 1 (aide) ─── */}
    <g>
      {/* Corps */}
      <path d="M160 150 Q180 170 200 150 L210 240 Q180 255 150 240 Z" fill={shirt1} />
      <path d="M155 235 Q180 250 205 235 L200 260 Q180 265 160 260 Z" fill={pants1} />
      {/* Tête */}
      <circle cx="178" cy="120" r="24" fill={skin} />
      <ellipse cx="178" cy="104" rx="22" ry="12" fill={hair1} />
      <ellipse cx="168" cy="115" rx="4" ry="3" fill={skinDark} />
      <ellipse cx="188" cy="115" rx="4" ry="3" fill={skinDark} />
      <path d="M173 126 Q178 130 183 126" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Bras tendu */}
      <path d="M198 175 Q240 160 260 170" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
    </g>

    {/* ─── Personnage 2 (reçoit) ─── */}
    <g>
      <path d="M200 160 Q220 180 240 160 L250 250 Q220 265 190 250 Z" fill={shirt2} />
      <path d="M195 245 Q220 260 245 245 L240 270 Q220 275 200 270 Z" fill={pants2} />
      <circle cx="220" cy="130" r="24" fill={skin} />
      <ellipse cx="220" cy="114" rx="23" ry="13" fill={hair2} />
      <ellipse cx="210" cy="125" rx="4" ry="3" fill={skinDark} />
      <ellipse cx="230" cy="125" rx="4" ry="3" fill={skinDark} />
      <path d="M215 136 Q220 140 225 136" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Bras reçoit */}
      <path d="M202 185 Q160 175 138 185" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
    </g>

    {/* Objet échangé */}
    <motion.rect x="192" y="155" width="20" height="18" rx="3" fill="#FFD700"
      animate={{ y: [155, 150, 155] }} transition={{ repeat: Infinity, duration: 2 }} />
    <motion.rect x="194" y="158" width="16" height="3" rx="1" fill="#FFF3CD" />

    {/* Cœur flottant */}
    <motion.path d="M200 60 C200 48 188 38 176 48 C164 58 164 74 180 85 L200 102 L220 85 C236 74 236 58 224 48 C212 38 200 48 200 60Z"
      className="fill-pink-400/50" animate={{ y: [-6, 6, -6] }} transition={{ repeat: Infinity, duration: 2.5 }} />

    {/* Étincelles */}
    <text x="60" y="70" fontSize="22" opacity="0.2">✦</text>
    <text x="320" y="60" fontSize="18" opacity="0.15">✦</text>
    <text x="350" y="220" fontSize="24" opacity="0.12">✦</text>
  </motion.svg>
);

// ─── Jardinage / Nature ──────────────────────────
export const GardenScene = ({ className = "w-72 h-72" }: { className?: string }) => (
  <motion.svg viewBox="0 0 380 300" fill="none" className={className}
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
    {/* Sol */}
    <path d="M0 240 Q190 220 380 240 L380 280 L0 280 Z" className="fill-accent/10" />
    {/* Soleil */}
    <circle cx="320" cy="50" r="32" className="fill-yellow-300/25" />
    <circle cx="320" cy="50" r="18" className="fill-yellow-200/30" />
    {/* Arbre */}
    <rect x="50" y="130" width="14" height="80" rx="4" className="fill-amber-700/25" />
    <circle cx="57" cy="115" r="40" className="fill-emerald-400/20" />
    <circle cx="35" cy="130" r="28" className="fill-emerald-400/15" />
    <circle cx="79" cy="130" r="28" className="fill-emerald-400/15" />
    {/* Personnage */}
    <g>
      <path d="M175 160 Q195 180 215 160 L225 240 Q195 255 165 240 Z" className="fill-primary/20" />
      <path d="M170 235 Q195 250 220 235 L215 260 Q195 265 175 260 Z" className="fill-primary/15" />
      <circle cx="195" cy="132" r="22" fill={skin} />
      <ellipse cx="195" cy="117" rx="21" ry="11" fill={hair2} />
      <ellipse cx="186" cy="127" rx="3.5" ry="2.5" fill={skinDark} />
      <ellipse cx="204" cy="127" rx="3.5" ry="2.5" fill={skinDark} />
      <path d="M190 138 Q195 142 200 138" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Bras avec arrosoir */}
      <path d="M218 180 Q250 170 268 165" stroke={skin} strokeWidth="8" strokeLinecap="round" fill="none" />
      {/* Arrosoir */}
      <rect x="262" y="148" width="20" height="18" rx="4" className="fill-sky-400/40" />
      <path d="M282 155 L290 148" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" strokeLinecap="round" />
      <!-- Gouttes -->
      <motion.circle cx="292" cy="145" r="2.5" className="fill-sky-400/30"
        animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} />
      <motion.circle cx="298" cy="148" r="2" className="fill-sky-400/25"
        animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.3 }} />
    </g>
    {/* Plantes */}
    <motion.g animate={{ y: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 3 }}>
      <path d="M130 235 Q135 210 142 200" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" fill="none" />
      <circle cx="142" cy="197" r="6" className="fill-emerald-400/25" />
      <path d="M270 238 Q275 215 282 205" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" fill="none" />
      <circle cx="282" cy="202" r="6" className="fill-emerald-400/25" />
    </motion.g>
    <text x="90" y="260" fontSize="14" opacity="0.25">🌱</text>
    <text x="300" y="265" fontSize="12" opacity="0.2">🌸</text>
  </motion.svg>
);

// ─── Discussion / Chat ──────────────────────────
export const ChatScene = ({ className = "w-72 h-72" }: { className?: string }) => (
  <motion.svg viewBox="0 0 380 300" fill="none" className={className}
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
    <ellipse cx="190" cy="270" rx="160" ry="16" className="fill-primary/5" />
    <circle cx="100" cy="220" r="90" className="fill-accent/5" />
    <circle cx="300" cy="200" r="80" className="fill-primary/5" />

    {/* Personnage gauche (assis) */}
    <g>
      <path d="M95 175 Q115 195 135 175 L140 250 Q115 260 90 250 Z" fill={shirt1} />
      <path d="M93 245 Q115 255 137 245 L133 268 Q115 272 97 268 Z" fill={pants1} />
      <circle cx="115" cy="148" r="21" fill={skin} />
      <ellipse cx="115" cy="133" rx="20" ry="10" fill={hair1} />
      <ellipse cx="107" cy="143" rx="3.5" ry="2.5" fill={skinDark} />
      <ellipse cx="123" cy="143" rx="3.5" ry="2.5" fill={skinDark} />
      <path d="M110 153 Q115 157 120 153" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M135 185 Q160 178 175 185" stroke={skin} strokeWidth="7" strokeLinecap="round" fill="none" />
      {/* Téléphone */}
      <rect x="173" y="172" width="14" height="24" rx="2" className="fill-foreground/20" />
    </g>

    {/* Personnage droite (debout) */}
    <g>
      <path d="M255 165 Q275 185 295 165 L305 245 Q275 260 245 245 Z" fill={shirt2} />
      <path d="M250 240 Q275 255 300 240 L295 265 Q275 270 255 265 Z" fill={pants2} />
      <circle cx="275" cy="138" r="22" fill={skin} />
      <ellipse cx="275" cy="122" rx="21" ry="11" fill={hair2} />
      <ellipse cx="267" cy="133" rx="3.5" ry="2.5" fill={skinDark} />
      <ellipse cx="283" cy="133" rx="3.5" ry="2.5" fill={skinDark} />
      <path d="M270 144 Q275 148 280 144" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M255 190 Q230 182 215 190" stroke={skin} strokeWidth="7" strokeLinecap="round" fill="none" />
    </g>

    {/* Bulles de dialogue */}
    <motion.rect x="200" y="80" width="140" height="38" rx="18" className="fill-primary/15"
      animate={{ y: [80, 76, 80] }} transition={{ repeat: Infinity, duration: 2.5, delay: 0 }} />
    <text x="215" y="105" fontSize="11" fill="currentColor" opacity="0.5">Besoin d'aide pour mon jardin ? 🌱</text>

    <motion.rect x="40" y="60" width="130" height="38" rx="18" className="fill-accent/15"
      animate={{ y: [60, 56, 60] }} transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }} />
    <text x="55" y="85" fontSize="11" fill="currentColor" opacity="0.5">Oui, avec plaisir ! 🤝</text>

    <motion.rect x="180" y="20" width="120" height="34" rx="17" className="fill-primary/10"
      animate={{ y: [20, 16, 20] }} transition={{ repeat: Infinity, duration: 2.5, delay: 1 }} />
    <text x="195" y="43" fontSize="11" fill="currentColor" opacity="0.5">Super, je viens t'aider 💪</text>
  </motion.svg>
);

// ─── Bricolage / Outils ──────────────────────────
export const ToolScene = ({ className = "w-72 h-72" }: { className?: string }) => (
  <motion.svg viewBox="0 0 380 300" fill="none" className={className}
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
    <ellipse cx="190" cy="270" rx="170" ry="16" className="fill-primary/5" />
    <circle cx="320" cy="80" r="30" className="fill-yellow-300/20" />
    {/* Personnage */}
    <g>
      <path d="M165 160 Q185 180 205 160 L215 245 Q185 260 155 245 Z" className="fill-accent/20" />
      <path d="M160 240 Q185 255 210 240 L205 265 Q185 270 165 265 Z" className="fill-accent/15" />
      <circle cx="185" cy="132" r="22" fill={skin} />
      <ellipse cx="185" cy="117" rx="21" ry="11" fill={hair1} />
      <ellipse cx="176" cy="127" rx="3.5" ry="2.5" fill={skinDark} />
      <ellipse cx="194" cy="127" rx="3.5" ry="2.5" fill={skinDark} />
      <path d="M180 138 Q185 142 190 138" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M160 185 Q130 175 115 170" stroke={skin} strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M208 185 Q240 175 255 170" stroke={skin} strokeWidth="8" strokeLinecap="round" fill="none" />
    </g>
    {/* Outils */}
    <g className="fill-amber-600/25">
      <rect x="95" y="145" width="6" height="50" rx="2" className="fill-amber-700/20" transform="rotate(-15 98 170)" />
      <rect x="85" y="145" width="16" height="6" rx="2" fill="currentColor" transform="rotate(-15 93 148)" />
    </g>
    <g className="fill-amber-600/25">
      <rect x="255" y="140" width="6" height="55" rx="2" className="fill-amber-700/20" transform="rotate(10 258 167)" />
      <rect x="252" y="138" width="16" height="6" rx="2" fill="currentColor" transform="rotate(10 260 141)" />
    </g>
    {/* Étincelles */}
    <text x="50" y="80" fontSize="18" opacity="0.2">🔧</text>
    <text x="310" y="240" fontSize="16" opacity="0.15">⚡</text>
  </motion.svg>
);

// ─── Communauté / Groupe ──────────────────────────
export const CommunityScene = ({ className = "w-80 h-72" }: { className?: string }) => (
  <motion.svg viewBox="0 0 420 300" fill="none" className={className}
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
    <ellipse cx="210" cy="270" rx="190" ry="18" className="fill-primary/5" />
    <circle cx="80" cy="180" r="70" className="fill-accent/5" />
    <circle cx="340" cy="180" r="70" className="fill-primary/5" />

    {/* Personnage 1 */}
    <g>
      <path d="M70 160 Q90 180 110 160 L120 245 Q90 260 60 245 Z" fill={shirt1} />
      <circle cx="90" cy="132" r="21" fill={skin} />
      <ellipse cx="90" cy="117" rx="20" ry="10" fill={hair1} />
      <ellipse cx="82" cy="127" rx="3" ry="2.5" fill={skinDark} />
      <ellipse cx="98" cy="127" rx="3" ry="2.5" fill={skinDark} />
      <path d="M85 138 Q90 142 95 138" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </g>

    {/* Personnage 2 (milieu, principal) */}
    <g>
      <path d="M180 150 Q205 175 230 150 L240 250 Q205 268 170 250 Z" fill={shirt2} />
      <path d="M175 245 Q205 262 235 245 L230 272 Q205 278 180 272 Z" fill={pants2} />
      <circle cx="205" cy="122" r="25" fill={skin} />
      <ellipse cx="205" cy="104" rx="24" ry="13" fill={hair2} />
      <ellipse cx="195" cy="117" rx="4" ry="3" fill={skinDark} />
      <ellipse cx="215" cy="117" rx="4" ry="3" fill={skinDark} />
      <path d="M199 129 Q205 134 211 129" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M178 195 Q150 185 135 190" stroke={skin} strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M232 195 Q260 185 275 190" stroke={skin} strokeWidth="8" strokeLinecap="round" fill="none" />
    </g>

    {/* Personnage 3 */}
    <g>
      <path d="M310 165 Q330 185 350 165 L360 245 Q330 260 300 245 Z" fill="#FF6B6B" opacity="0.2" />
      <circle cx="330" cy="138" r="21" fill={skin} />
      <ellipse cx="330" cy="123" rx="20" ry="10" fill={hair1} />
      <ellipse cx="322" cy="133" rx="3.5" ry="2.5" fill={skinDark} />
      <ellipse cx="338" cy="133" rx="3.5" ry="2.5" fill={skinDark} />
      <path d="M325 144 Q330 148 335 144" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </g>

    {/* Cœurs */}
    <motion.path d="M205 70 C205 58 193 48 181 58 C169 68 169 84 185 95 L205 112 L225 95 C241 84 241 68 229 58 C217 48 205 58 205 70Z"
      className="fill-pink-400/40" animate={{ y: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 2.5 }} />

    {/* Étoiles */}
    <motion.text x="170" y="50" fontSize="16" opacity="0.3"
      animate={{ rotate: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 3 }}>⭐</motion.text>
  </motion.svg>
);

// ─── Bienvenue (une personne) ────────────────────
export const WelcomeScene = ({ className = "w-64 h-64" }: { className?: string }) => (
  <motion.svg viewBox="0 0 300 280" fill="none" className={className}
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
    <circle cx="150" cy="150" r="110" className="fill-primary/5" />
    <circle cx="150" cy="150" r="70" className="fill-accent/5" />
    <ellipse cx="150" cy="250" rx="120" ry="14" className="fill-primary/5" />

    {/* Personnage */}
    <g>
      <path d="M125 165 Q145 185 165 165 L175 250 Q145 265 115 250 Z" className="fill-primary/20" />
      <path d="M120 245 Q145 260 170 245 L165 270 Q145 275 125 270 Z" className="fill-primary/15" />
      <circle cx="145" cy="138" r="24" fill={skin} />
      <ellipse cx="145" cy="120" rx="23" ry="12" fill={hair1} />
      <ellipse cx="135" cy="133" rx="4" ry="3" fill={skinDark} />
      <ellipse cx="155" cy="133" rx="4" ry="3" fill={skinDark} />
      <path d="M140 145 Q145 150 150 145" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Bras tendu pour aider */}
      <motion.path d="M125 200 Q90 190 75 200" stroke={skin} strokeWidth="8" strokeLinecap="round" fill="none"
        animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 2 }} />
    </g>

    {/* Cœur */}
    <motion.path d="M230 90 C230 78 220 68 210 78 C200 88 200 104 215 115 L230 130 L245 115 C260 104 260 88 250 78 C240 68 230 78 230 90Z"
      className="fill-pink-400/50" animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} />

    {/* Étincelles */}
    <text x="50" y="60" fontSize="18" opacity="0.2">✨</text>
    <text x="230" y="50" fontSize="14" opacity="0.15">🌟</text>
    <text x="80" y="230" fontSize="16" opacity="0.12">🌸</text>
  </motion.svg>
);

// ─── Message / Enveloppe ──────────────────────────
export const MailScene = ({ className = "w-56 h-56" }: { className?: string }) => (
  <motion.svg viewBox="0 0 280 240" fill="none" className={className}
    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
    <circle cx="140" cy="120" r="90" className="fill-primary/5" />

    {/* Enveloppe géante */}
    <motion.g animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
      <rect x="50" y="55" width="180" height="120" rx="16" className="fill-accent/10 stroke-accent/20" strokeWidth="2" />
      <path d="M50 70 L140 125 L230 70" className="stroke-accent/25" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Petit cœur dans l'enveloppe */}
      <path d="M130 105 C130 98 122 92 115 98 C108 104 108 115 120 123 L140 138 L160 123 C172 115 172 104 165 98 C158 92 150 98 150 105 C150 98 142 92 135 98 C128 104 130 112 140 118" className="fill-pink-400/40" />
    </motion.g>

    {/* Points d'animation */}
    <motion.circle cx="100" cy="195" r="4" className="fill-accent/25"
      animate={{ y: [0, -7, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} />
    <motion.circle cx="140" cy="195" r="4" className="fill-accent/25"
      animate={{ y: [0, -7, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} />
    <motion.circle cx="180" cy="195" r="4" className="fill-accent/25"
      animate={{ y: [0, -7, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} />
  </motion.svg>
);
