import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCategoryById } from "./constants";

export default function SubCategoryScreen() {
  const router = useRouter();
  const { category: categoryId } = useLocalSearchParams<{ category: string }>();
  const category = categoryId ? getCategoryById(categoryId) : null;

  if (!category) {
    return (
      <View className="flex-1 bg-ios-bg items-center justify-center">
        <Text className="text-ios-grey4">Category not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSelectSubService = (subService: string) => {
    router.push({
      pathname: "/(app)/scan-to-pay",
      params: {
        billCategory: category.label,
        billSubCategory: subService,
      },
    });
  };

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center px-5 py-3 bg-white border-b border-ios-border">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="chevron-back" size={24} color="#0A84FF" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-ios-dark">
            {category.label}
          </Text>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <Text className="text-ios-grey4 text-sm mb-4">
            Select the bill or service you want to pay
          </Text>

          <View style={{ gap: 12 }}>
            {category.subServices.map((sub) => (
              <TouchableOpacity
                key={sub}
                className="bg-white rounded-2xl border border-ios-border p-4 flex-row items-center"
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => handleSelectSubService(sub)}
              >
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center mr-4"
                  style={{ backgroundColor: `${category.color}18` }}
                >
                  <Ionicons
                    name="receipt-outline"
                    size={22}
                    color={category.color}
                  />
                </View>
                <Text className="text-ios-dark font-semibold text-base flex-1">
                  {sub}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
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
