import React, { ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type IconName = keyof typeof Ionicons.glyphMap;

type NavRowProps = {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  accessibilityLabel: string;
  iconColor?: string;
  showChevron?: boolean;
  rightElement?: ReactNode;
};

export function NavRow({
  icon,
  label,
  value,
  onPress,
  accessibilityLabel,
  iconColor,
  showChevron = true,
  rightElement,
}: NavRowProps) {
  const theme = useTheme();
  const rowIconColor = iconColor ?? theme.accent;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
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
      {value ? (
        <Text className="text-sm mr-2" style={{ color: theme.subtext }}>
          {value}
        </Text>
      ) : null}
      {rightElement ? <View className="mr-2">{rightElement}</View> : null}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
      ) : null}
    </Pressable>
  );
}
