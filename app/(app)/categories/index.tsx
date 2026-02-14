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
import { CATEGORIES } from "./constants";

export default function CategoriesScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center px-5 py-3 bg-white border-b border-ios-border">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 p-1"
          >
            <Ionicons name="chevron-back" size={24} color="#0A84FF" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-ios-dark">Select a Category</Text>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <Text className="text-ios-grey4 text-sm mb-4">
            Choose a category to pay bills or find services
          </Text>

          {/* Categories Grid */}
          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                className="bg-white rounded-3xl border border-ios-border p-4"
                style={[styles.card, { width: "47%" }]}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: "/(app)/categories/[category]",
                    params: { category: cat.id },
                  })
                }
              >
                <View
                  className="w-12 h-12 rounded-2xl items-center justify-center mb-3"
                  style={{ backgroundColor: `${cat.color}12` }}
                >
                  <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                </View>
                <Text className="text-ios-dark font-semibold text-base">
                  {cat.label}
                </Text>
                <Text className="text-ios-grey4 text-xs mt-0.5">
                  {cat.desc}
                </Text>
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
