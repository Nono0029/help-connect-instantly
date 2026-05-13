import { motion } from "framer-motion";

export const CommunityIllustration = ({ className = "w-72 h-72" }: { className?: string }) => (
  <motion.svg
    viewBox="0 0 400 300"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.6 }}
  >
    {/* Fond doux */}
    <ellipse cx="200" cy="260" rx="160" ry="20" className="fill-primary/5" />
    <circle cx="80" cy="180" r="50" className="fill-primary/10" />
    <circle cx="320" cy="160" r="40" className="fill-accent/10" />
    <circle cx="200" cy="100" r="30" className="fill-yellow-300/20" />

    {/* Personne 1 - gauche */}
    <circle cx="130" cy="140" r="22" className="fill-primary/30" />
    <path d="M110 200 Q130 220 150 200 L150 250 Q130 260 110 250 Z" className="fill-primary/20" />

    {/* Personne 2 - droite */}
    <circle cx="270" cy="130" r="22" className="fill-accent/30" />
    <path d="M250 190 Q270 210 290 190 L290 240 Q270 250 250 240 Z" className="fill-accent/20" />

    {/* Cœur entre les deux */}
    <motion.path
      d="M200 130 C200 115 185 105 175 115 C165 125 165 140 180 150 L200 165 L220 150 C235 140 235 125 225 115 C215 105 200 115 200 130Z"
      className="fill-pink-400/60"
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ repeat: Infinity, duration: 2 }}
    />

    {/* Ligne de connexion */}
    <line x1="152" y1="145" x2="248" y2="135" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2" strokeDasharray="6 4" />

    {/* Étoiles décoratives */}
    <text x="50" y="60" fontSize="20" opacity="0.3">✦</text>
    <text x="330" y="80" fontSize="16" opacity="0.25">✦</text>
    <text x="200" y="40" fontSize="14" opacity="0.2">✦</text>
  </motion.svg>
);

export const ChatIllustration = ({ className = "w-60 h-60" }: { className?: string }) => (
  <motion.svg
    viewBox="0 0 300 250"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    {/* Fond */}
    <circle cx="150" cy="130" r="100" className="fill-accent/8" />

    {/* Bulle de message 1 */}
    <motion.rect
      x="20" y="30" width="180" height="45" rx="20"
      className="fill-primary/15"
      animate={{ y: [30, 25, 30] }}
      transition={{ repeat: Infinity, duration: 3, delay: 0 }}
    />
    <text x="35" y="58" fontSize="12" fill="currentColor" opacity="0.5">Besoin d'aide pour mon jardin 🌱</text>

    {/* Bulle de message 2 */}
    <motion.rect
      x="100" y="90" width="170" height="45" rx="20"
      className="fill-accent/15"
      animate={{ y: [90, 85, 90] }}
      transition={{ repeat: Infinity, duration: 3, delay: 0.5 }}
    />
    <text x="115" y="118" fontSize="12" fill="currentColor" opacity="0.5">Je peux t'aider ! 💪</text>

    {/* Bulle de message 3 */}
    <motion.rect
      x="30" y="150" width="160" height="40" rx="20"
      className="fill-primary/10"
      animate={{ y: [150, 145, 150] }}
      transition={{ repeat: Infinity, duration: 3, delay: 1 }}
    />
    <text x="45" y="175" fontSize="12" fill="currentColor" opacity="0.5">Merci beaucoup ! 🤝</text>

    {/* Petit coeur */}
    <text x="250" y="220" fontSize="24" opacity="0.3">💬</text>
  </motion.svg>
);

export const WelcomeIllustration = ({ className = "w-64 h-64" }: { className?: string }) => (
  <motion.svg
    viewBox="0 0 350 280"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.8 }}
  >
    {/* Fond */}
    <circle cx="175" cy="150" r="120" className="fill-primary/5" />
    <circle cx="175" cy="150" r="80" className="fill-accent/5" />

    {/* Personnage principal */}
    <circle cx="175" cy="100" r="28" className="fill-primary/25" />
    <path d="M145 170 Q175 200 205 170 L205 240 Q175 260 145 240 Z" className="fill-primary/15" />

    {/* Mains tendues */}
    <path d="M120 160 Q100 140 90 150 Q80 160 95 175" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M230 160 Q250 140 260 150 Q270 160 255 175" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" strokeLinecap="round" fill="none" />

    {/* Cœur flottant */}
    <motion.path
      d="M175 50 C175 40 165 32 155 40 C145 48 145 60 155 68 L175 85 L195 68 C205 60 205 48 195 40 C185 32 175 40 175 50Z"
      className="fill-pink-400/50"
      animate={{ y: [-5, 5, -5] }}
      transition={{ repeat: Infinity, duration: 2.5 }}
    />

    {/* Petits points décoratifs */}
    <circle cx="80" cy="60" r="4" className="fill-yellow-300/40" />
    <circle cx="280" cy="80" r="3" className="fill-accent/30" />
    <circle cx="60" cy="200" r="5" className="fill-primary/20" />
    <circle cx="290" cy="180" r="4" className="fill-yellow-300/30" />
    <circle cx="175" cy="30" r="3" className="fill-accent/25" />
  </motion.svg>
);

export const EmptyChatIllustration = ({ className = "w-56 h-56" }: { className?: string }) => (
  <motion.svg
    viewBox="0 0 280 240"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
  >
    {/* Fond */}
    <circle cx="140" cy="120" r="90" className="fill-primary/5" />

    {/* Enveloppe / Message */}
    <motion.rect
      x="60" y="60" width="160" height="110" rx="16"
      className="fill-accent/10 stroke-accent/20"
      strokeWidth="2"
      animate={{ y: [0, -4, 0] }}
      transition={{ repeat: Infinity, duration: 3 }}
    />
    <path d="M60 75 L140 130 L220 75" className="stroke-accent/25" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />

    {/* Points de suspension */}
    <motion.circle cx="100" cy="155" r="4" className="fill-accent/30" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} />
    <motion.circle cx="140" cy="155" r="4" className="fill-accent/30" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} />
    <motion.circle cx="180" cy="155" r="4" className="fill-accent/30" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} />

    {/* Papillons */}
    <text x="20" y="40" fontSize="18" opacity="0.2">🦋</text>
    <text x="220" y="220" fontSize="16" opacity="0.2">🌸</text>
  </motion.svg>
);

export const HelpIllustration = ({ className = "w-64 h-64" }: { className?: string }) => (
  <motion.svg
    viewBox="0 0 380 280"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.6 }}
  >
    {/* Soleil/ciel */}
    <circle cx="320" cy="50" r="35" className="fill-yellow-300/25" />
    <circle cx="320" cy="50" r="20" className="fill-yellow-200/30" />

    {/* Sol */}
    <path d="M0 230 Q190 210 380 230 L380 250 L0 250 Z" className="fill-accent/10" />
    <path d="M0 240 Q190 225 380 240 L380 250 L0 250 Z" className="fill-accent/15" />

    {/* Arbre */}
    <rect x="80" y="140" width="12" height="60" className="fill-amber-700/30" rx="3" />
    <circle cx="86" cy="130" r="35" className="fill-emerald-400/25" />
    <circle cx="70" cy="140" r="25" className="fill-emerald-400/20" />
    <circle cx="102" cy="140" r="25" className="fill-emerald-400/20" />

    {/* Personne avec outils */}
    <circle cx="200" cy="110" r="20" className="fill-primary/25" />
    <path d="M180 170 Q200 190 220 170 L220 230 Q200 240 180 230 Z" className="fill-primary/15" />

    {/* Outil (pelle) */}
    <line x1="225" y1="165" x2="255" y2="120" className="stroke-amber-600/30" strokeWidth="3" strokeLinecap="round" />
    <path d="M255 115 L265 105 L270 110 L260 120 Z" className="fill-amber-600/25" />

    {/* Petites fleurs */}
    <text x="140" y="235" fontSize="14" opacity="0.3">🌸</text>
    <text x="260" y="240" fontSize="12" opacity="0.25">🌱</text>
    <text x="50" y="250" fontSize="16" opacity="0.2">🌿</text>

    {/* Nuage */}
    <path d="M40 70 Q50 55 65 60 Q80 45 100 55 Q115 45 125 60 Q135 55 140 70 Z" className="fill-sky-200/30" />
  </motion.svg>
);
