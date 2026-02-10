export const Colors = {
  // Primary brand
  primary: "#0A84FF",
  primaryHover: "#0071E3",
  primaryLight: "#0A84FF10",

  // Accent colors
  accentGreen: "#30D158",
  accentGreenAlt: "#34C759",
  accentPurple: "#5E5CE6",
  accentViolet: "#7C3AED",

  // Backgrounds
  background: "#F2F2F7",
  backgroundAlt: "#F5F5F7",
  card: "#FFFFFF",

  // Text
  text: "#1C1C1E",
  textAlt: "#1D1D1F",
  textSecondary: "#8E8E93",
  textMuted: "#86868B",

  // Borders
  border: "#E5E5EA",
  borderLight: "#D2D2D7",
  borderFaint: "#F5F5F7",

  // Status
  success: "#30D158",
  warning: "#FF9500",
  danger: "#FF3B30",

  // Gradients
  gradient: {
    hero: ["#0A84FF", "#5E5CE6", "#7C3AED"] as const,
    heroSimple: ["#0A84FF", "#0066CC"] as const,
    button: ["#0A84FF", "#0071E3"] as const,
    greenSuccess: ["#30D158", "#28C04D"] as const,
  },

  // Tab bar
  tabActive: "#0A84FF",
  tabInactive: "#8E8E93",

  // Misc
  white: "#FFFFFF",
  black: "#1C1C1E",
  overlay: "rgba(0, 0, 0, 0.4)",
};

export default Colors;
