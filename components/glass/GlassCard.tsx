import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { cn } from "@/lib/utils";

interface GlassCardProps extends ViewProps {
  className?: string;
  children: React.ReactNode;
  noPadding?: boolean;
  // Legacy props kept for compatibility (now ignored)
  intensity?: number;
  tint?: string;
}

export function GlassCard({
  className,
  children,
  noPadding = false,
  style,
  intensity: _intensity,
  tint: _tint,
  ...props
}: GlassCardProps) {
  return (
    <View
      className={cn(
        "overflow-hidden rounded-3xl border border-ios-border bg-white",
        className
      )}
      style={[styles.container, style]}
      {...props}
    >
      <View className={cn(noPadding ? "" : "p-4")}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
});
