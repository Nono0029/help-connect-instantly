import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["Outfit", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        outfit: ["Outfit", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Pastel palette
        pastel: {
          yellow: "#f6e58d",
          "yellow-dark": "#f0d060",
          green: "#badc58",
          "green-dark": "#a0c840",
          mint: "#dfffd8",
          cream: "#fffef6",
          soft: "#fffbeb",
          glow: "#fff4b5",
          peach: "#ffecd2",
          sky: "#e0f4ff",
          lavender: "#f0e6ff",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1.5rem",
        "2xl": "2rem",
        "3xl": "2.5rem",
        "4xl": "3rem",
        full: "9999px",
      },
      boxShadow: {
        glow: "0 0 30px rgba(255, 220, 80, 0.3), 0 8px 32px rgba(255, 200, 50, 0.15)",
        "glow-green": "0 0 30px rgba(100, 220, 140, 0.3), 0 8px 32px rgba(80, 200, 120, 0.15)",
        soft: "0 8px 40px rgba(255, 220, 80, 0.2), 0 2px 12px rgba(100, 220, 140, 0.1)",
        magic: "0 16px 60px rgba(246, 229, 141, 0.35), 0 4px 20px rgba(186, 220, 88, 0.2)",
        card: "0 8px 32px rgba(255, 220, 80, 0.1), 0 2px 8px rgba(0,0,0,0.04)",
        "card-hover": "0 16px 48px rgba(255, 220, 80, 0.2), 0 4px 16px rgba(0,0,0,0.06)",
        warm: "0 4px 20px rgba(246, 229, 141, 0.4)",
        "warm-lg": "0 8px 30px rgba(246, 229, 141, 0.6)",
      },
      backgroundImage: {
        "pastel-gradient": "linear-gradient(135deg, #fffef6 0%, #dfffd8 100%)",
        "magic-gradient": "linear-gradient(135deg, #f6e58d 0%, #badc58 100%)",
        "warm-gradient": "linear-gradient(135deg, #fff4b5 0%, #ffecd2 100%)",
        "cool-gradient": "linear-gradient(135deg, #dfffd8 0%, #e0f4ff 100%)",
        "hero-gradient": "linear-gradient(135deg, #fffef6 0%, #fff4b5 40%, #dfffd8 100%)",
        "card-gradient": "linear-gradient(135deg, rgba(255,254,246,0.8) 0%, rgba(223,255,216,0.6) 100%)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
        blob: {
          "0%, 100%": { borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" },
          "50%": { borderRadius: "30% 60% 70% 40% / 50% 60% 30% 60%" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        sparkle: {
          "0%, 100%": { transform: "scale(0) rotate(0deg)", opacity: "0" },
          "50%": { transform: "scale(1) rotate(180deg)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        float: "float 4s ease-in-out infinite",
        glow: "glow-pulse 3s ease-in-out infinite",
        blob: "blob 8s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
        "fade-up": "fade-up 0.5s ease-out",
        sparkle: "sparkle 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
