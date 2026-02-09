import React from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { cn } from "@/lib/utils";

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "glass" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
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
}: GlassButtonProps) {
  const isDisabled = disabled || loading;

  const sizeClasses = {
    sm: "px-4 py-2",
    md: "px-6 py-3",
    lg: "px-8 py-4",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  if (variant === "primary") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        className={cn("overflow-hidden rounded-2xl", className)}
        style={[isDisabled && styles.disabled, style]}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#6C63FF", "#8B85FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className={cn(
            "flex-row items-center justify-center",
            sizeClasses[size]
          )}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              {icon && <>{icon}</>}
              <Text
                className={cn(
                  "font-semibold text-white text-center",
                  textSizeClasses[size],
                  icon ? "ml-2" : ""
                )}
              >
                {title}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === "secondary") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        className={cn(
          "overflow-hidden rounded-2xl border border-primary",
          className
        )}
        style={[isDisabled && styles.disabled, style]}
        activeOpacity={0.8}
      >
        <View
          className={cn(
            "flex-row items-center justify-center",
            sizeClasses[size]
          )}
        >
          {loading ? (
            <ActivityIndicator color="#6C63FF" size="small" />
          ) : (
            <>
              {icon && <>{icon}</>}
              <Text
                className={cn(
                  "font-semibold text-primary text-center",
                  textSizeClasses[size],
                  icon ? "ml-2" : ""
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

  if (variant === "danger") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        className={cn("overflow-hidden rounded-2xl bg-danger", className)}
        style={[isDisabled && styles.disabled, style]}
        activeOpacity={0.8}
      >
        <View
          className={cn(
            "flex-row items-center justify-center",
            sizeClasses[size]
          )}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text
              className={cn(
                "font-semibold text-white text-center",
                textSizeClasses[size]
              )}
            >
              {title}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Glass variant
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      className={cn(
        "overflow-hidden rounded-2xl border border-glass-border",
        className
      )}
      style={[styles.glassContainer, isDisabled && styles.disabled, style]}
      activeOpacity={0.8}
    >
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      <View
        className={cn(
          "flex-row items-center justify-center",
          sizeClasses[size]
        )}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            {icon && <>{icon}</>}
            <Text
              className={cn(
                "font-semibold text-white text-center",
                textSizeClasses[size],
                icon ? "ml-2" : ""
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
  glassContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  disabled: {
    opacity: 0.5,
  },
});

