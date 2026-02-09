import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <LinearGradient
      colors={["#0A0E1A", "#151929", "#0A0E1A"]}
      className="flex-1 items-center justify-center"
    >
      <ActivityIndicator size="large" color="#6C63FF" />
      <Text className="text-white/60 mt-4 text-base">{message}</Text>
    </LinearGradient>
  );
}
