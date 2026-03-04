import React from "react";
import { Pressable, Text } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type DestructiveButtonProps = {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
};

export function DestructiveButton({
  label,
  onPress,
  accessibilityLabel,
}: DestructiveButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="items-center justify-center py-3"
    >
      <Text className="text-base font-semibold" style={{ color: theme.danger }}>
        {label}
      </Text>
    </Pressable>
  );
}

