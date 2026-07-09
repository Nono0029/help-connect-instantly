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
      screens: {
        "2xl": "1400px",
      },
    },

    extend: {
      fontFamily: {
        sans: [
          "DM Sans",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        display: [
          "Plus Jakarta Sans",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
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
          foreground:
            "hsl(var(--destructive-foreground))",
        },

        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground:
            "hsl(var(--muted-foreground))",
        },

        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground:
            "hsl(var(--accent-foreground))",
        },

        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground:
            "hsl(var(--popover-foreground))",
        },

        card: {
          DEFAULT: "hsl(var(--card))",
          foreground:
            "hsl(var(--card-foreground))",
        },

        sidebar: {
          DEFAULT:
            "hsl(var(--sidebar-background))",

          foreground:
            "hsl(var(--sidebar-foreground))",

          primary:
            "hsl(var(--sidebar-primary))",

          "primary-foreground":
            "hsl(var(--sidebar-primary-foreground))",

          accent:
            "hsl(var(--sidebar-accent))",

          "accent-foreground":
            "hsl(var(--sidebar-accent-foreground))",

          border:
            "hsl(var(--sidebar-border))",

          ring:
            "hsl(var(--sidebar-ring))",
        },

        pastel: {
          yellow: "#f6e58d",
          green: "#badc58",
          mint: "#dfffd8",
          cream: "#fffef6",
          soft: "#fffbeb",
          glow: "#fff4b5",
          peach: "#ffecd2",
          sky: "#e0f4ff",
          lavender: "#f0e6ff",
        },

        night: {
          blue: "#06131a",
          cyan: "#00b4d8",
          green: "#00c875",
          card: "#0b1c24",
          border: "#163847",
        },
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",

        xl: "1.5rem",
        "2xl": "2rem",
        "3xl": "2.5rem",
      },

      boxShadow: {
        magic:
          "0 16px 60px rgba(224,162,59,0.25), 0 4px 20px rgba(61,122,84,0.15)",

        soft:
          "0 8px 40px rgba(224,162,59,0.15)",

        glow:
          "0 0 30px rgba(224,162,59,0.3)",

        "dark-glow":
          "0 0 30px rgba(78,168,112,0.3)",

        card:
          "0 8px 32px rgba(61,122,84,0.08)",

        "dark-card":
          "0 8px 32px rgba(78,168,112,0.1)",
      },

      backgroundImage: {
        "magic-gradient":
          "linear-gradient(135deg,#4C8B64 0%,#2A5940 100%)",

        "hero-gradient":
          "linear-gradient(135deg,#FBF6EA 0%,#F3E9CE 50%,#EAF3DE 100%)",

        "dark-gradient":
          "linear-gradient(135deg,#1A1712 0%,#211F1A 50%,#1D2618 100%)",

        "cyan-gradient":
          "linear-gradient(135deg,#4C8B64 0%,#2A5940 100%)",
      },

      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },

          to: {
            height:
              "var(--radix-accordion-content-height)",
          },
        },

        "accordion-up": {
          from: {
            height:
              "var(--radix-accordion-content-height)",
          },

          to: {
            height: "0",
          },
        },

        float: {
          "0%, 100%": {
            transform: "translateY(0px)",
          },

          "50%": {
            transform: "translateY(-8px)",
          },
        },

        blob: {
          "0%,100%": {
            borderRadius:
              "60% 40% 30% 70% / 60% 30% 70% 40%",
          },

          "50%": {
            borderRadius:
              "30% 60% 70% 40% / 50% 60% 30% 60%",
          },
        },

        glow: {
          "0%,100%": {
            opacity: "0.6",
            transform: "scale(1)",
          },

          "50%": {
            opacity: "1",
            transform: "scale(1.05)",
          },
        },

        shimmer: {
          "0%": {
            backgroundPosition: "-200% center",
          },

          "100%": {
            backgroundPosition: "200% center",
          },
        },
      },

      animation: {
        "accordion-down":
          "accordion-down 0.2s ease-out",

        "accordion-up":
          "accordion-up 0.2s ease-out",

        float:
          "float 4s ease-in-out infinite",

        blob:
          "blob 8s ease-in-out infinite",

        glow:
          "glow 3s ease-in-out infinite",

        shimmer:
          "shimmer 2s infinite",
      },
    },
  },

  plugins: [tailwindcssAnimate],
} satisfies Config;
