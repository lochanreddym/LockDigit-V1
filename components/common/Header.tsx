import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
  rightComponent?: React.ReactNode;
}

export function Header({
  title,
  subtitle,
  showBack = false,
  rightAction,
  rightComponent,
}: HeaderProps) {
  const router = useRouter();

  return (
    <View className="flex-row items-center justify-between px-5 py-3">
      <View className="flex-row items-center flex-1">
        {showBack && (
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 p-1"
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <View className="flex-1">
          <Text className="text-xl font-bold text-white">{title}</Text>
          {subtitle && (
            <Text className="text-sm text-white/60 mt-0.5">{subtitle}</Text>
          )}
        </View>
      </View>
      {rightAction && (
        <TouchableOpacity onPress={rightAction.onPress} className="p-2">
          <Ionicons name={rightAction.icon} size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
      {rightComponent}
    </View>
  );
}
