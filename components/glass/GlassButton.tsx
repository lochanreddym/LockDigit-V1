import React from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from "react-native";
import { cn } from "@/lib/utils";

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "tertiary" | "danger" | "glass" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function GlassButton({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className,
  icon,
  style,
  fullWidth = false,
}: GlassButtonProps) {
  const isDisabled = disabled || loading;

  const sizeClasses = {
    sm: "px-4 py-2.5",
    md: "px-6 py-3.5",
    lg: "px-8 py-4",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const variantClasses: Record<string, string> = {
    primary: "bg-primary rounded-2xl",
    secondary:
      "bg-white rounded-2xl border border-ios-border",
    tertiary: "bg-transparent rounded-2xl",
    danger: "bg-danger rounded-2xl",
    glass:
      "bg-white rounded-2xl border border-ios-border",
    outline:
      "bg-white rounded-2xl border border-ios-border",
  };

  const textClasses: Record<string, string> = {
    primary: "text-white",
    secondary: "text-ios-dark",
    tertiary: "text-primary",
    danger: "text-white",
    glass: "text-ios-dark",
    outline: "text-ios-dark",
  };

  const loaderColor: Record<string, string> = {
    primary: "#FFFFFF",
    secondary: "#0A84FF",
    tertiary: "#0A84FF",
    danger: "#FFFFFF",
    glass: "#0A84FF",
    outline: "#0A84FF",
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      className={cn(
        variantClasses[variant],
        fullWidth && "w-full",
        className
      )}
      style={[
        variant === "primary" && styles.primaryShadow,
        variant === "secondary" && styles.secondaryShadow,
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
    >
      <View
        className={cn(
          "flex-row items-center justify-center",
          sizeClasses[size]
        )}
      >
        {loading ? (
          <ActivityIndicator color={loaderColor[variant]} size="small" />
        ) : (
          <>
            {icon && <View className="mr-2">{icon}</View>}
            <Text
              className={cn(
                "font-semibold text-center",
                textSizeClasses[size],
                textClasses[variant]
              )}
            >
              {title}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primaryShadow: {
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  secondaryShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  disabled: {
    opacity: 0.4,
  },
});
