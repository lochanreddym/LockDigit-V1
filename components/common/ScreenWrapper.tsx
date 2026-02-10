import React from "react";
import { View, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn } from "@/lib/utils";

interface ScreenWrapperProps {
  children: React.ReactNode;
  className?: string;
  safeArea?: boolean;
  bg?: "default" | "white" | "alt";
}

export function ScreenWrapper({
  children,
  className,
  safeArea = true,
  bg = "default",
}: ScreenWrapperProps) {
  const bgClass =
    bg === "white"
      ? "bg-white"
      : bg === "alt"
        ? "bg-ios-bgAlt"
        : "bg-ios-bg";

  const content = (
    <View className={cn("flex-1", bgClass, className)}>
      <StatusBar barStyle="dark-content" />
      {children}
    </View>
  );

  if (safeArea) {
    return (
      <SafeAreaView className={cn("flex-1", bgClass)}>
        {content}
      </SafeAreaView>
    );
  }

  return content;
}
