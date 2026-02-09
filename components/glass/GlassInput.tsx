import React from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
} from "react-native";
import { BlurView } from "expo-blur";
import { cn } from "@/lib/utils";

interface GlassInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  containerClassName?: string;
}

export function GlassInput({
  label,
  error,
  icon,
  containerClassName,
  className,
  ...props
}: GlassInputProps) {
  return (
    <View className={cn("mb-4", containerClassName)}>
      {label && (
        <Text className="text-sm text-white/70 mb-2 font-medium">
          {label}
        </Text>
      )}
      <View
        className={cn(
          "overflow-hidden rounded-2xl border",
          error ? "border-danger" : "border-glass-border"
        )}
        style={styles.container}
      >
        <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
        <View className="flex-row items-center px-4 py-3">
          {icon && <View className="mr-3">{icon}</View>}
          <TextInput
            className={cn("flex-1 text-white text-base", className)}
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            style={styles.input}
            {...props}
          />
        </View>
      </View>
      {error && (
        <Text className="text-xs text-danger mt-1 ml-1">{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  input: {
    fontSize: 16,
  },
});
