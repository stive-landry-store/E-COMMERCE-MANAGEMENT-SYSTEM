/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07051a",
          900: "#0f0a2a",
          800: "#171040",
          700: "#a8a3c7",
          600: "#c9c5e0",
        },
        sand: {
          50: "#f6f9fc",
          100: "#f3f5f9",
          200: "#e3e9ef",
        },
        gold: {
          50: "#fff3f9",
          100: "#ffe0ef",
          300: "#ff8fc4",
          400: "#ff5aa8",
          500: "#ff2d95",
          600: "#e0217f",
          700: "#c0186b",
        },
        flare: {
          orange: "#ff7a45",
          peach: "#ffa06b",
          pink: "#ff2d95",
          magenta: "#e11d74",
          purple: "#c026d3",
        },
      },
      fontFamily: {
        sans: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 0.125rem 0.25rem rgba(0,0,0,0.15)",
        soft: "0 0.75rem 2rem -0.75rem rgba(0,0,0,0.45)",
        glow: "0 0.75rem 2rem -0.5rem rgba(255,45,149,0.45)",
      },
      backgroundImage: {
        "brand-grad": "linear-gradient(120deg, #ff7a45 0%, #ff2d95 48%, #c026d3 100%)",
        "brand-soft": "linear-gradient(180deg, rgba(255,45,149,0.18), transparent)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        shine: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "fade-up": "fade-up 0.65s ease both",
        marquee: "marquee 28s linear infinite",
        shine: "shine 6s ease infinite",
        "pulse-glow": "pulse-glow 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
