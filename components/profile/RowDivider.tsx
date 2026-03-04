import React from "react";
import { View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

export function RowDivider() {
  const theme = useTheme();

  return <View className="h-px ml-14" style={{ backgroundColor: theme.border }} />;
}

