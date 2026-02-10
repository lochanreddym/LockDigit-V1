import React from "react";
import { View, Text, ActivityIndicator } from "react-native";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-ios-bg">
      <ActivityIndicator size="large" color="#0A84FF" />
      <Text className="text-ios-grey4 mt-4 text-base">{message}</Text>
    </View>
  );
}
