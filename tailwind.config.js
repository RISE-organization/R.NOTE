/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gold: {
          500: '#D4AF37',
          400: '#E5C158',
          600: '#B5952B',
        },
        emerald: {
          900: '#064E3B',
          800: '#065F46',
        },
        midnight: {
          900: '#0F172A',
          800: '#1E293B',
        },
      },
    },
    animation: {
      first: "moveVertical 30s ease infinite",
      second: "moveInCircle 20s reverse infinite",
      third: "moveInCircle 40s linear infinite",
      fourth: "moveHorizontal 40s ease infinite",
      fifth: "moveInCircle 20s ease infinite",
      swing: "swing 3s ease-in-out infinite",
      "breathe-glow": "breathe-glow 4s ease-in-out infinite",
      "blob-1": "blob-float-1 28s ease-in-out infinite",
      "blob-2": "blob-float-2 22s ease-in-out infinite reverse",
      "blob-3": "blob-float-3 35s ease-in-out infinite",
      "blob-4": "blob-float-4 20s ease-in-out infinite alternate",
    },
    keyframes: {
      "breathe-glow": {
        "0%, 100%": { boxShadow: "0 0 15px rgba(249, 115, 22, 0.2)" },
        "50%": { boxShadow: "0 0 40px rgba(249, 115, 22, 0.6), 0 0 60px rgba(249, 115, 22, 0.2)" },
      },
      swing: {
        "0%, 100%": { transform: "rotate(10deg)" },
        "50%": { transform: "rotate(-10deg)" },
      },
      moveHorizontal: {
        "0%": { transform: "translateX(-50%) translateY(-10%)" },
        "50%": { transform: "translateX(50%) translateY(10%)" },
        "100%": { transform: "translateX(-50%) translateY(-10%)" },
      },
      moveVertical: {
        "0%": { transform: "translateY(-50%)" },
        "50%": { transform: "translateY(50%)" },
        "100%": { transform: "translateY(-50%)" },
      },
      moveInCircle: {
        "0%": { transform: "rotate(0deg)" },
        "50%": { transform: "rotate(180deg)" },
        "100%": { transform: "rotate(360deg)" },
      },
    },
  },

  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.will-change-transform': { 'will-change': 'transform' },
      });
    }
  ],
}