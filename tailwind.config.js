/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // LockDigit brand palette
        primary: {
          DEFAULT: "#6C63FF",
          50: "#F0EEFF",
          100: "#D9D6FF",
          200: "#B3ADFF",
          300: "#8D85FF",
          400: "#6C63FF",
          500: "#5A50E6",
          600: "#483FCC",
          700: "#362FB3",
          800: "#241F99",
          900: "#121080",
        },
        secondary: {
          DEFAULT: "#00D9FF",
          50: "#E0FAFF",
          100: "#B3F3FF",
          200: "#80ECFF",
          300: "#4DE5FF",
          400: "#00D9FF",
          500: "#00B8D9",
          600: "#0097B3",
          700: "#00768C",
          800: "#005566",
          900: "#003440",
        },
        dark: {
          DEFAULT: "#0A0E1A",
          50: "#1A1F33",
          100: "#151929",
          200: "#121620",
          300: "#0F1319",
          400: "#0A0E1A",
          500: "#080B14",
          600: "#06080F",
          700: "#040509",
          800: "#020304",
          900: "#000000",
        },
        glass: {
          DEFAULT: "rgba(255, 255, 255, 0.08)",
          light: "rgba(255, 255, 255, 0.12)",
          border: "rgba(255, 255, 255, 0.15)",
          highlight: "rgba(255, 255, 255, 0.20)",
        },
        success: "#00C853",
        warning: "#FFB300",
        danger: "#FF3D71",
      },
      borderRadius: {
        glass: "20px",
      },
      fontFamily: {
        sans: ["Inter", "System"],
        display: ["Inter", "System"],
      },
    },
  },
  plugins: [],
};
