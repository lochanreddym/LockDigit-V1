export const Colors = {
  primary: "#6C63FF",
  primaryLight: "#8B85FF",
  primaryDark: "#5A50E6",
  secondary: "#00D9FF",
  secondaryDark: "#00B8D9",

  dark: "#0A0E1A",
  darkCard: "#1A1F33",
  darkSurface: "#151929",
  darkBorder: "#2A2F45",

  glass: "rgba(255, 255, 255, 0.08)",
  glassLight: "rgba(255, 255, 255, 0.12)",
  glassBorder: "rgba(255, 255, 255, 0.15)",
  glassHighlight: "rgba(255, 255, 255, 0.20)",

  text: "#FFFFFF",
  textSecondary: "#A0A5BD",
  textMuted: "#6B7093",

  success: "#00C853",
  warning: "#FFB300",
  danger: "#FF3D71",

  gradient: {
    primary: ["#6C63FF", "#00D9FF"] as const,
    dark: ["#0A0E1A", "#151929"] as const,
    card: ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"] as const,
  },
};

export default Colors;
