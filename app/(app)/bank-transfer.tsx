import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";

const BANK_COLORS = [
  "#7C3AED",
  "#2563EB",
  "#059669",
  "#D97706",
  "#DC2626",
  "#7C3AED",
];

function getBankColor(index: number) {
  return BANK_COLORS[index % BANK_COLORS.length];
}

export default function BankTransferScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;

  const accounts = useQuery(
    api.payments.listBankAccounts,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const savedRecipients = useQuery(
    api.payments.listSavedRecipients,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const intlRecipients = useQuery(
    api.payments.listInternationalRecipients,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  const loading = accounts === undefined;

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
            Bank & Self Transfer
          </Text>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* Self Transfer Section */}
            <View className="px-5 mt-2">
              <Text className="text-ios-dark font-semibold text-lg mb-3">
                Your Accounts
              </Text>
              <Text className="text-ios-grey4 text-xs mb-3">
                Tap an account to transfer money to it from another account
              </Text>
              {accounts && accounts.length > 0 ? (
                accounts.map((account, index) => (
                  <TouchableOpacity
                    key={account._id}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/self-transfer",
                        params: { destinationAccountId: account._id },
                      })
                    }
                    className="mb-3"
                  >
                    <View
                      className="bg-white rounded-2xl border border-ios-border p-4 flex-row items-center"
                      style={styles.cardShadow}
                    >
                      <View
                        className="w-12 h-12 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: getBankColor(index) + "18" }}
                      >
                        <Ionicons
                          name={
                            account.type === "card"
                              ? "card-outline"
                              : "business-outline"
                          }
                          size={24}
                          color={getBankColor(index)}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-ios-dark font-semibold text-base">
                          {account.bankName}
                        </Text>
                        <Text className="text-ios-grey4 text-sm mt-0.5">
                          {account.type === "card" ? "Card" : "Account"} ••••{" "}
                          {account.accountLast4}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="#C7C7CC"
                      />
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View
                  className="bg-white rounded-2xl border border-ios-border p-6 items-center"
                  style={styles.cardShadow}
                >
                  <Ionicons
                    name="wallet-outline"
                    size={32}
                    color="#C7C7CC"
                  />
                  <Text className="text-ios-grey4 text-sm mt-2">
                    No accounts linked yet
                  </Text>
                </View>
              )}
            </View>

            {/* Domestic Transfer Section */}
            <View className="px-5 mt-6">
              <Text className="text-ios-dark font-semibold text-lg mb-3">
                Send to Another Account
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: "/(app)/send-to-account",
                    params: { recipientId: "new" },
                  })
                }
                className="mb-3"
              >
                <View
                  className="bg-white rounded-2xl border border-ios-border p-4 flex-row items-center"
                  style={styles.cardShadow}
                >
                  <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-3">
                    <Ionicons name="add" size={24} color="#7C3AED" />
                  </View>
                  <Text className="text-primary font-semibold text-base flex-1">
                    Add New Recipient
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#C7C7CC"
                  />
                </View>
              </TouchableOpacity>
              {savedRecipients &&
                savedRecipients.map((r) => (
                  <TouchableOpacity
                    key={r._id}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/send-to-account",
                        params: { recipientId: r._id },
                      })
                    }
                    className="mb-3"
                  >
                    <View
                      className="bg-white rounded-2xl border border-ios-border p-4 flex-row items-center"
                      style={styles.cardShadow}
                    >
                      <View className="w-12 h-12 rounded-full bg-blue-500/10 items-center justify-center mr-3">
                        <Text className="text-blue-600 font-bold text-lg">
                          {r.recipientName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-ios-dark font-semibold text-base">
                          {r.recipientName}
                        </Text>
                        <Text className="text-ios-grey4 text-sm mt-0.5">
                          {r.bankName} •••• {r.accountLast4}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="#C7C7CC"
                      />
                    </View>
                  </TouchableOpacity>
                ))}
            </View>

            {/* International Section */}
            <View className="px-5 mt-6">
              <Text className="text-ios-dark font-semibold text-lg mb-3">
                Send Internationally
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: "/(app)/send-internationally",
                    params: { recipientId: "new" },
                  })
                }
                className="mb-3"
              >
                <View
                  className="bg-white rounded-2xl border border-ios-border p-4 flex-row items-center"
                  style={styles.cardShadow}
                >
                  <View className="w-12 h-12 rounded-full bg-emerald-500/10 items-center justify-center mr-3">
                    <Ionicons name="globe-outline" size={24} color="#059669" />
                  </View>
                  <Text className="text-emerald-600 font-semibold text-base flex-1">
                    New International Transfer
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#C7C7CC"
                  />
                </View>
              </TouchableOpacity>
              {intlRecipients &&
                intlRecipients.map((r) => (
                  <TouchableOpacity
                    key={r._id}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/send-internationally",
                        params: { recipientId: r._id },
                      })
                    }
                    className="mb-3"
                  >
                    <View
                      className="bg-white rounded-2xl border border-ios-border p-4 flex-row items-center"
                      style={styles.cardShadow}
                    >
                      <View className="w-12 h-12 rounded-full bg-emerald-500/10 items-center justify-center mr-3">
                        <Ionicons name="globe" size={24} color="#059669" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-ios-dark font-semibold text-base">
                          {r.firstName} {r.lastName}
                          {r.nickname ? ` (${r.nickname})` : ""}
                        </Text>
                        <Text className="text-ios-grey4 text-sm mt-0.5">
                          {r.country} • {r.bankName} •••• {r.accountLast4}
                        </Text>
                      </View>
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
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
});
