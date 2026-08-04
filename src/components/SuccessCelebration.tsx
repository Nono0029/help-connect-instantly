import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { CSSProperties } from "react";

interface SuccessCelebrationProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
}

const CONFETTI_COLORS = ["#22c55e", "#39ff88", "#4ade80", "#fbbf24", "#ffffff"];

const Confetti = () => (
  <>
    {Array.from({ length: 24 }).map((_, i) => {
      const left = (i * 37 + 13) % 100;
      const delay = (i % 8) * 0.08;
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      return (
        <span
          key={i}
          className="confetti-piece"
          style={{ left: `${left}%`, background: color, "--delay": `${delay}s`, animationDelay: `${delay}s` } as CSSProperties}
        />
      );
    })}
  </>
);

const SuccessCelebration = ({ open, title = "Succès !", subtitle, onClose }: SuccessCelebrationProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto" onClick={() => { setVisible(false); onClose?.(); }} />
          <Confetti />
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="success-pop relative z-10 bg-white dark:bg-[#111f35] rounded-[32px] p-8 flex flex-col items-center shadow-2xl shadow-emerald-500/20 border border-white/10 mx-8"
          >
            <div className="relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 14 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-[#39ff88] to-[#22c55e] flex items-center justify-center shadow-lg shadow-emerald-500/40"
              >
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                  <path
                    className="success-check"
                    d="M4 12.5 L9.5 18 L20 6.5"
                    stroke="#052e16"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-foreground font-display">{title}</h3>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground text-center">{subtitle}</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default SuccessCelebration;
