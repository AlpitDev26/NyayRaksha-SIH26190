import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nyaya: {
          darkest: "#0B132B",
          dark: "#1C2541",
          primary: "#1E3A8A", // Deep Navy
          secondary: "#3B82F6",
          accent: "#0D9488",  // Restrained Teal
          slate: "#334155",
          light: "#F8FAFC",
        },
        verified: {
          DEFAULT: "#10B981", // Emerald
          bg: "#ECFDF5",
          border: "#A7F3D0",
          text: "#065F46",
        },
        warning: {
          DEFAULT: "#F59E0B", // Amber
          bg: "#FFFBEB",
          border: "#FDE68A",
          text: "#92400E",
        },
        tampered: {
          DEFAULT: "#EF4444", // Crimson
          bg: "#FEF2F2",
          border: "#FECACA",
          text: "#991B1B",
        },
      },
    },
  },
  plugins: [],
};
export default config;
