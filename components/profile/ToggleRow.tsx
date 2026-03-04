import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Switch, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type IconName = keyof typeof Ionicons.glyphMap;

type ToggleRowProps = {
  icon: IconName;
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
  iconColor?: string;
};

export function ToggleRow({
  icon,
  label,
  value,
  onValueChange,
  accessibilityLabel,
  iconColor,
}: ToggleRowProps) {
  const theme = useTheme();
  const rowIconColor = iconColor ?? theme.accent;

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      className="min-h-[54px] flex-row items-center px-4 py-2"
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: `${rowIconColor}14` }}
      >
        <Ionicons name={icon} size={18} color={rowIconColor} />
      </View>
      <Text className="text-base flex-1" style={{ color: theme.text }}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#D1D5DB", true: `${theme.accent}66` }}
        thumbColor={value ? theme.accent : "#F9FAFB"}
        ios_backgroundColor="#D1D5DB"
      />
    </Pressable>
  );
}

