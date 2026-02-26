import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { DOCUMENT_CATEGORIES } from "@/constants/documentCategories";
import { applyOpacity } from "@/lib/utils";

export default function DocumentCategoriesScreen() {
  const router = useRouter();

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
                Document Categories
              </Text>
              <Text className="text-ios-grey4 text-sm mt-0.5">
                Select a category to add documents
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}
        >
          <View className="px-5">
            {DOCUMENT_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() =>
                  router.push({
                    pathname: "/(app)/document-categories/[category]",
                    params: { category: cat.id },
                  })
                }
                activeOpacity={0.7}
                className="mb-3"
              >
                <View
                  className="bg-white rounded-2xl border border-ios-border p-4 flex-row items-center"
                  style={styles.card}
                >
                  <View
                    className="w-12 h-12 rounded-2xl items-center justify-center mr-4"
                    style={{ backgroundColor: applyOpacity(cat.color, 0.08) }}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={24}
                      color={cat.color}
                    />
                  </View>
                  <Text className="flex-1 text-ios-dark font-semibold text-base">
                    {cat.label}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#C7C7CC"
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
});
