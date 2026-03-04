import React, { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type SectionCardProps = {
  children: ReactNode;
  style?: ViewStyle;
};

export function SectionCard({ children, style }: SectionCardProps) {
  const theme = useTheme();

  return (
    <View
      className="rounded-[22px] border overflow-hidden"
      style={[
        styles.shadow,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
});

