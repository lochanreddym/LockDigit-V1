import { useColorScheme } from "react-native";

export type AppTheme = {
  bg: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
  accent: string;
  success: string;
  danger: string;
};

const LIGHT_THEME: AppTheme = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  text: "#1C1C1E",
  subtext: "#8E8E93",
  border: "#E5E5EA",
  accent: "#0A84FF",
  success: "#30D158",
  danger: "#FF3B30",
};

const DARK_THEME: AppTheme = {
  bg: "#000000",
  card: "#1C1C1E",
  text: "#F2F2F7",
  subtext: "#A1A1AA",
  border: "#2C2C2E",
  accent: "#4DA3FF",
  success: "#32D74B",
  danger: "#FF453A",
};

export function useTheme(): AppTheme {
  const colorScheme = useColorScheme();
  return colorScheme === "dark" ? DARK_THEME : LIGHT_THEME;
}

