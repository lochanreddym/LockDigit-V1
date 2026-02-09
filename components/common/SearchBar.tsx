import React from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onClear?: () => void;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search documents, bills, services...",
  onFocus,
  onClear,
}: SearchBarProps) {
  return (
    <View
      className="mx-5 my-2 overflow-hidden rounded-2xl border border-glass-border"
      style={styles.container}
    >
      <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
      <View className="flex-row items-center px-4 py-3">
        <Ionicons
          name="search"
          size={20}
          color="rgba(255, 255, 255, 0.5)"
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
          className="flex-1 text-white text-base ml-3"
          onFocus={onFocus}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              onChangeText("");
              onClear?.();
            }}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color="rgba(255, 255, 255, 0.5)"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
});
