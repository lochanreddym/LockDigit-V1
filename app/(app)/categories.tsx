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

const CATEGORIES = [
  { icon: "flash-outline", label: "Utilities", color: "#FF9500", desc: "Electricity, Gas, Water" },
  { icon: "call-outline", label: "Telecom", color: "#0A84FF", desc: "Phone, Mobile plans" },
  { icon: "wifi-outline", label: "Internet", color: "#5E5CE6", desc: "Broadband, Fiber" },
  { icon: "tv-outline", label: "Cable & TV", color: "#FF3B30", desc: "Cable, Streaming" },
  { icon: "shield-outline", label: "Insurance", color: "#30D158", desc: "Health, Auto, Life" },
  { icon: "home-outline", label: "Rent & Mortgage", color: "#FF9500", desc: "Housing payments" },
  { icon: "school-outline", label: "Education", color: "#0A84FF", desc: "Tuition, Loans" },
  { icon: "car-outline", label: "Transport", color: "#5E5CE6", desc: "Gas, Parking, Tolls" },
  { icon: "medkit-outline", label: "Healthcare", color: "#FF3B30", desc: "Medical, Dental" },
  { icon: "card-outline", label: "Banking", color: "#30D158", desc: "Loans, Credit cards" },
  { icon: "globe-outline", label: "Government", color: "#8E8E93", desc: "Taxes, Fees" },
  { icon: "receipt-outline", label: "Other", color: "#8E8E93", desc: "Misc bills" },
] as const;

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
          <Text className="text-xl font-bold text-ios-dark">Categories</Text>
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
                key={cat.label}
                className="bg-white rounded-3xl border border-ios-border p-4"
                style={[styles.card, { width: "47%" }]}
                activeOpacity={0.7}
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
