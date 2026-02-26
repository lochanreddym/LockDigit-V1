import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { US_STATES } from "@/constants/documentCategories";

export default function SelectStateScreen() {
  const router = useRouter();
  const { docType, docLabel } = useLocalSearchParams<{
    docType: string;
    docLabel: string;
  }>();

  const safeDocType = docType ?? "document";
  const safeDocLabel = docLabel ?? "Document";

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return US_STATES;
    const q = search.toLowerCase().trim();
    return US_STATES.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSelect = (stateCode: string, stateName: string) => {
    router.push({
      pathname: "/(app)/(tabs)/wallet",
      params: {
        addDocType: safeDocType,
        addDocLabel: `${safeDocLabel} — ${stateName}`,
        addDocState: stateCode,
      },
    });
  };

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="bg-white border-b border-ios-border px-5 py-3">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-ios-bg items-center justify-center mr-3"
            >
              <Ionicons name="chevron-back" size={22} color="#1C1C1E" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-xl font-bold text-ios-dark">
                Select State
              </Text>
              <Text className="text-ios-grey4 text-sm mt-0.5" numberOfLines={1}>
                {safeDocLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <View className="px-5 pt-4 pb-2">
          <View
            className="flex-row items-center bg-white rounded-xl border border-ios-border px-3.5 py-2.5"
            style={styles.searchCard}
          >
            <Ionicons name="search" size={18} color="#8E8E93" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search state..."
              placeholderTextColor="#8E8E93"
              className="flex-1 ml-2.5 text-ios-dark text-sm"
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color="#C7C7CC" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-5 pt-2">
            <View
              className="bg-white rounded-2xl border border-ios-border overflow-hidden"
              style={styles.card}
            >
              {filtered.length === 0 ? (
                <View className="px-4 py-8 items-center">
                  <Ionicons name="search-outline" size={32} color="#C7C7CC" />
                  <Text className="text-ios-grey4 text-sm mt-2">
                    No states found
                  </Text>
                </View>
              ) : (
                filtered.map((state, idx) => (
                  <TouchableOpacity
                    key={state.code}
                    onPress={() => handleSelect(state.code, state.name)}
                    activeOpacity={0.6}
                    className={`flex-row items-center px-4 py-3.5 ${
                      idx < filtered.length - 1
                        ? "border-b border-ios-border"
                        : ""
                    }`}
                  >
                    <View className="w-10 h-7 rounded bg-ios-bg items-center justify-center mr-3">
                      <Text className="text-ios-dark text-xs font-bold">
                        {state.code}
                      </Text>
                    </View>
                    <Text className="flex-1 text-ios-dark text-sm font-medium">
                      {state.name}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#C7C7CC"
                    />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  searchCard: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
});
