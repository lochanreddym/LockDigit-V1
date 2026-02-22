import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const TRANSFER_OPTIONS = [
  {
    icon: "call-outline" as const,
    label: "To Mobile\nNumber",
    colors: ["#7C3AED", "#6D28D9"] as const,
    badge: true,
    route: "/(app)/send-to-mobile" as const,
  },
  {
    icon: "business-outline" as const,
    label: "To Bank &\nSelf A/c",
    colors: ["#7C3AED", "#6D28D9"] as const,
    route: "/(app)/bank-transfer" as const,
  },
  {
    icon: "arrow-down-circle-outline" as const,
    label: "Receive\nMoney",
    colors: ["#7C3AED", "#6D28D9"] as const,
    route: "/(app)/receive-money" as const,
  },
] as const;

export default function MoneyTransferScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="flex-row items-center px-5 pt-2 pb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white border border-ios-border items-center justify-center mr-3"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#1C1C1E" />
          </TouchableOpacity>
          <Text className="text-ios-dark text-xl font-bold">
            Money Transfers
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View className="px-5 mt-4">
            <View className="flex-row justify-between">
              {TRANSFER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.label}
                  activeOpacity={0.8}
                  className="items-center"
                  style={styles.optionContainer}
                  onPress={() => {
                    if (option.route) {
                      router.push(option.route);
                    }
                  }}
                >
                  <View style={styles.iconWrapper}>
                    <LinearGradient
                      colors={[option.colors[0], option.colors[1]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.iconCircle}
                    >
                      <View style={styles.innerCircle}>
                        <Ionicons
                          name={option.icon}
                          size={28}
                          color="#FFFFFF"
                        />
                      </View>
                    </LinearGradient>
                    {"badge" in option && option.badge && (
                      <View style={styles.badge}>
                        <View style={styles.badgeDot} />
                      </View>
                    )}
                  </View>
                  <Text
                    className="text-ios-dark text-xs font-medium text-center mt-2.5"
                    numberOfLines={2}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="px-5 mt-8">
            <Text className="text-ios-dark font-semibold text-lg mb-3">
              Recent Transfers
            </Text>
            <View
              className="bg-white rounded-3xl border border-ios-border items-center justify-center"
              style={styles.emptyCard}
            >
              <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-3">
                <Ionicons
                  name="swap-horizontal-outline"
                  size={32}
                  color="#7C3AED"
                />
              </View>
              <Text className="text-ios-grey4 text-sm font-medium">
                No recent transfers
              </Text>
              <Text className="text-ios-grey4 text-xs mt-1">
                Your transfer history will appear here
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  optionContainer: {
    width: "30%",
  },
  iconWrapper: {
    position: "relative",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  innerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#30D158",
  },
  emptyCard: {
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
});
