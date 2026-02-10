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
        // LockDigit iOS-style palette (from Figma)
        primary: {
          DEFAULT: "#0A84FF",
          50: "#E5F2FF",
          100: "#CCE4FF",
          200: "#99C9FF",
          300: "#66ADFF",
          400: "#3392FF",
          500: "#0A84FF",
          600: "#0071E3",
          700: "#005BB5",
          800: "#004488",
          900: "#002E5A",
        },
        accent: {
          green: "#30D158",
          greenDark: "#34C759",
          purple: "#5E5CE6",
          violet: "#7C3AED",
          orange: "#FF9500",
        },
        ios: {
          bg: "#F2F2F7",
          bgAlt: "#F5F5F7",
          card: "#FFFFFF",
          dark: "#1C1C1E",
          darkAlt: "#1D1D1F",
          grey1: "#F2F2F7",
          grey2: "#E5E5EA",
          grey3: "#C7C7CC",
          grey4: "#8E8E93",
          grey5: "#86868B",
          grey6: "#D2D2D7",
          border: "#E5E5EA",
          borderLight: "#D2D2D7",
        },
        success: "#30D158",
        warning: "#FF9500",
        danger: "#FF3B30",
      },
      borderRadius: {
        "ios-sm": "12px",
        "ios-md": "16px",
        "ios-lg": "20px",
        "ios-xl": "24px",
        "ios-2xl": "32px",
        "ios-3xl": "40px",
      },
      fontFamily: {
        sans: ["System"],
        display: ["System"],
      },
      boxShadow: {
        "ios-sm": "0 2px 8px rgba(0, 0, 0, 0.04)",
        "ios-md": "0 8px 16px rgba(0, 0, 0, 0.08)",
        "ios-lg": "0 20px 40px rgba(0, 0, 0, 0.1)",
        "ios-blue": "0 8px 16px rgba(10, 132, 255, 0.25)",
      },
    },
  },
  plugins: [],
};
