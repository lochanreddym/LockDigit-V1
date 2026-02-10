import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { formatCurrency } from "@/lib/utils";

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { amount, merchantName, reference } = useLocalSearchParams<{
    amount: string;
    merchantName: string;
    reference?: string;
  }>();

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1">
        <View className="flex-1 items-center justify-center px-5">
          {/* Success Icon */}
          <LinearGradient
            colors={["#30D158", "#28C04D"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="w-24 h-24 rounded-full items-center justify-center mb-6"
            style={styles.successShadow}
          >
            <Ionicons name="checkmark" size={56} color="#FFFFFF" />
          </LinearGradient>

          <Text className="text-ios-dark text-2xl font-bold text-center">
            Payment Successful!
          </Text>
          <Text className="text-ios-grey4 text-base mt-2 text-center">
            Your payment has been processed successfully
          </Text>

          {/* Receipt Card */}
          <View
            className="bg-white rounded-3xl border border-ios-border p-5 w-full mt-8"
            style={styles.cardShadow}
          >
            <View className="items-center py-2">
              <Text className="text-ios-grey4 text-sm">Amount Paid</Text>
              <Text className="text-ios-dark text-3xl font-bold mt-1">
                {formatCurrency(parseInt(amount || "0", 10))}
              </Text>
            </View>

            <View className="border-t border-ios-border mt-4 pt-4">
              {merchantName && (
                <View className="flex-row justify-between py-2">
                  <Text className="text-ios-grey4 text-sm">Merchant</Text>
                  <Text className="text-ios-dark text-sm font-medium">
                    {merchantName}
                  </Text>
                </View>
              )}
              {reference && (
                <View className="flex-row justify-between py-2">
                  <Text className="text-ios-grey4 text-sm">Reference</Text>
                  <Text className="text-ios-dark text-sm font-medium">
                    {reference}
                  </Text>
                </View>
              )}
              <View className="flex-row justify-between py-2">
                <Text className="text-ios-grey4 text-sm">Status</Text>
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color="#30D158" />
                  <Text className="text-success text-sm font-medium ml-1">
                    Completed
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between py-2">
                <Text className="text-ios-grey4 text-sm">Date</Text>
                <Text className="text-ios-dark text-sm font-medium">
                  {new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* Notification badges */}
          <View className="flex-row gap-3 mt-6">
            <View className="flex-row items-center bg-success/10 px-3 py-2 rounded-full">
              <Ionicons name="mail-outline" size={14} color="#30D158" />
              <Text className="text-success text-xs ml-1">Receipt emailed</Text>
            </View>
            <View className="flex-row items-center bg-primary/10 px-3 py-2 rounded-full">
              <Ionicons name="notifications-outline" size={14} color="#0A84FF" />
              <Text className="text-primary text-xs ml-1">Notification sent</Text>
            </View>
          </View>
        </View>

        {/* Bottom Actions */}
        <View className="px-5 pb-4">
          <TouchableOpacity
            onPress={() => router.replace("/(app)/(tabs)/home")}
            className="bg-primary rounded-2xl py-4 mb-3"
            style={styles.buttonShadow}
            activeOpacity={0.8}
          >
            <Text className="text-white text-center font-semibold text-base">
              Done
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace("/(app)/(tabs)/payments")}
            className="bg-white rounded-2xl py-4 border border-ios-border"
            activeOpacity={0.8}
          >
            <Text className="text-ios-dark text-center font-semibold text-base">
              View Transaction History
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  successShadow: {
    shadowColor: "#30D158",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonShadow: {
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
});
