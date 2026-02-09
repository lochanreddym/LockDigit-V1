import React from "react";
import { View, StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn } from "@/lib/utils";

interface ScreenWrapperProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  safeArea?: boolean;
}

export function ScreenWrapper({
  children,
  className,
  gradient = true,
  safeArea = true,
}: ScreenWrapperProps) {
  const content = (
    <View className={cn("flex-1", className)}>
      <StatusBar barStyle="light-content" />
      {children}
    </View>
  );

  const wrapped = safeArea ? (
    <SafeAreaView className="flex-1">{content}</SafeAreaView>
  ) : (
    content
  );

  if (gradient) {
    return (
      <LinearGradient
        colors={["#0A0E1A", "#151929", "#0A0E1A"]}
        className="flex-1"
      >
        {wrapped}
      </LinearGradient>
    );
  }

  return (
    <View className="flex-1 bg-dark">{wrapped}</View>
  );
}
