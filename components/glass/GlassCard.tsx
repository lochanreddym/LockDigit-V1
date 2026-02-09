import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { BlurView } from "expo-blur";
import { cn } from "@/lib/utils";

interface GlassCardProps extends ViewProps {
  intensity?: number;
  tint?: "light" | "dark" | "default";
  className?: string;
  children: React.ReactNode;
  noPadding?: boolean;
}

export function GlassCard({
  intensity = 30,
  tint = "dark",
  className,
  children,
  noPadding = false,
  style,
  ...props
}: GlassCardProps) {
  return (
    <View
      className={cn(
        "overflow-hidden rounded-[20px] border border-glass-border",
        className
      )}
      style={[styles.container, style]}
      {...props}
    >
      <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
      <View
        className={cn(noPadding ? "" : "p-4")}
        style={styles.content}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  content: {
    zIndex: 1,
  },
});
