import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <View className="w-20 h-20 rounded-full bg-ios-bg items-center justify-center mb-4">
        <Ionicons name={icon} size={36} color="#C7C7CC" />
      </View>
      <Text className="text-lg font-semibold text-ios-dark text-center mb-2">
        {title}
      </Text>
      <Text className="text-sm text-ios-grey4 text-center mb-6">
        {description}
      </Text>
      {action}
    </View>
  );
}
