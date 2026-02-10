import React from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
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
      className="mx-5 my-2 overflow-hidden rounded-2xl border border-ios-border bg-white"
      style={styles.container}
    >
      <View className="flex-row items-center px-4 py-3">
        <Ionicons
          name="search"
          size={20}
          color="#8E8E93"
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#86868B"
          className="flex-1 text-ios-dark text-base ml-3"
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
              color="#C7C7CC"
            />
          </TouchableOpacity>
        )}
      </View>
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
});
