import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0B1120",
          900: "#0F172A",
          800: "#111827",
        },
        bridge: {
          background: "#F8FAFC",
          foreground: "#0F172A",
          teal: "#0D9488",
          tealLight: "#14B8A6",
          amber: "#F59E0B",
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "var(--font-manrope)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 16px 40px rgba(15, 23, 42, 0.08)",
        glass: "0 20px 60px rgba(15, 23, 42, 0.18)",
      },
      borderRadius: {
        bridge: "0.625rem",
      },
    },
  },
};

export default config;
