import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          accent: "#635BFF",
          hover: "#5148E8",
          soft: "#A29BFF",
          cyan: "#2AE8F0",
        },
        surface: {
          base: "#0D0D0F",
          panel: "#16161A",
          raised: "#1E1E23",
        },
        border: {
          subtle: "#2A2A2F",
        },
        text: {
          primary: "#ECECEC",
          secondary: "#9CA3AF",
          tertiary: "#6B7280",
          disabled: "#4A4A50",
        },
        status: {
          success: "#10B981",
          warning: "#F59E0B",
          error: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-inter-tight)", "Inter Tight", "Inter", "sans-serif"],
      },
      boxShadow: {
        surface: "0 4px 12px rgba(0,0,0,0.25)",
        glow: "0 0 20px #635BFF55",
      },
      borderRadius: {
        card: "12px",
        button: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
