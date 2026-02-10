import React from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
} from "react-native";
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
        <Text className="text-sm text-ios-dark mb-2 font-medium">
          {label}
        </Text>
      )}
      <View
        className={cn(
          "overflow-hidden rounded-2xl border bg-white",
          error ? "border-danger" : "border-ios-borderLight"
        )}
        style={styles.container}
      >
        <View className="flex-row items-center px-4 py-3">
          {icon && <View className="mr-3">{icon}</View>}
          <TextInput
            className={cn("flex-1 text-ios-dark text-base", className)}
            placeholderTextColor="#86868B"
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  input: {
    fontSize: 16,
  },
});
