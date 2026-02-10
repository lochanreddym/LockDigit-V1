import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
  rightComponent?: React.ReactNode;
  transparent?: boolean;
}

export function Header({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  rightComponent,
  transparent = false,
}: HeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View
      className={cn(
        "flex-row items-center justify-between px-5 py-3",
        !transparent && "bg-white border-b border-ios-border"
      )}
    >
      <View className="flex-row items-center flex-1">
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            className="mr-3 p-1"
          >
            <Ionicons name="chevron-back" size={24} color="#0A84FF" />
          </TouchableOpacity>
        )}
        <View className="flex-1">
          {title && (
            <Text className="text-xl font-bold text-ios-dark">{title}</Text>
          )}
          {subtitle && (
            <Text className="text-sm text-ios-grey4 mt-0.5">{subtitle}</Text>
          )}
        </View>
      </View>
      {rightAction && (
        <TouchableOpacity onPress={rightAction.onPress} className="p-2">
          <Ionicons name={rightAction.icon} size={24} color="#0A84FF" />
        </TouchableOpacity>
      )}
      {rightComponent}
    </View>
  );
}
