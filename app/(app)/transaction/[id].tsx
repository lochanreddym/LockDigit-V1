import React from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useFirebaseSessionReady } from "@/hooks/useFirebaseSessionReady";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusColors: Record<string, string> = {
  pending: "#FF9500",
  completed: "#30D158",
  failed: "#FF3B30",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  completed: "Completed",
  failed: "Failed",
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="py-3 border-b border-ios-border">
      <Text className="text-ios-grey4 text-xs">{label}</Text>
      <Text className="text-ios-dark text-sm mt-1">{value}</Text>
    </View>
  );
}

export default function TransactionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const transactionId = typeof params.id === "string" ? params.id : "";
  const { hasUser: firebaseHasUser } = useFirebaseSessionReady();
  const user = useQuery(api.users.getMe, firebaseHasUser ? {} : "skip");
  const transaction = useQuery(
    api.payments.getTransactionById,
    firebaseHasUser && transactionId
      ? { transactionId: transactionId as Id<"transactions"> }
      : "skip"
  );

  const canGoBack = router.canGoBack();
  const senderName = user?.name?.trim() || "User";

  if (transaction === undefined) {
    return (
      <View className="flex-1 bg-ios-bg items-center justify-center">
        <ActivityIndicator size="large" color="#0A84FF" />
        <Text className="text-ios-grey4 mt-3">Loading transaction details...</Text>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View className="flex-1 bg-ios-bg">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center px-5 py-3 bg-white border-b border-ios-border">
            <TouchableOpacity
              onPress={() =>
                canGoBack ? router.back() : router.replace("/(app)/(tabs)/payments")
              }
              className="mr-3 p-1"
            >
              <Ionicons name="chevron-back" size={24} color="#0A84FF" />
            </TouchableOpacity>
            <Text className="text-ios-dark text-xl font-bold">Transaction Details</Text>
          </View>
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-ios-grey4 text-center">
              Transaction details are unavailable.
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const statusColor = statusColors[transaction.status] ?? "#8E8E93";
  const statusLabel = statusLabels[transaction.status] ?? "Pending";

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center px-5 py-3 bg-white border-b border-ios-border">
          <TouchableOpacity
            onPress={() =>
              canGoBack ? router.back() : router.replace("/(app)/(tabs)/payments")
            }
            className="mr-3 p-1"
          >
            <Ionicons name="chevron-back" size={24} color="#0A84FF" />
          </TouchableOpacity>
          <Text className="text-ios-dark text-xl font-bold">Transaction Details</Text>
        </View>

        <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="bg-white rounded-3xl border border-ios-border p-5">
            <Text className="text-ios-grey4 text-xs">Amount</Text>
            <Text className="text-ios-dark text-3xl font-bold mt-1">
              {formatCurrency(transaction.amount)}
            </Text>

            <View className="flex-row items-center mt-3">
              <View
                className="w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: statusColor }}
              />
              <Text style={{ color: statusColor }} className="text-sm font-medium">
                {statusLabel}
              </Text>
            </View>

            <View className="mt-4">
              <DetailRow label="Sender" value={senderName} />
              <DetailRow label="Transaction ID" value={transaction._id} />
              <DetailRow label="Type" value={transaction.type} />
              <DetailRow label="Description" value={transaction.description} />
              {transaction.merchantName ? (
                <DetailRow label="Merchant" value={transaction.merchantName} />
              ) : null}
              {transaction.recipientPhone ? (
                <DetailRow label="Recipient Phone" value={transaction.recipientPhone} />
              ) : null}
              {transaction.paymentMethod ? (
                <DetailRow label="Payment Method" value={transaction.paymentMethod} />
              ) : null}
              {transaction.paymentState ? (
                <DetailRow label="Payment State" value={transaction.paymentState} />
              ) : null}
              {transaction.stripePaymentIntentId ? (
                <DetailRow
                  label="Payment Intent ID"
                  value={transaction.stripePaymentIntentId}
                />
              ) : null}
              <DetailRow label="Created On" value={formatDate(transaction.createdAt)} />
              {transaction.completedAt ? (
                <DetailRow label="Completed On" value={formatDate(transaction.completedAt)} />
              ) : null}
              {transaction.updatedAt ? (
                <DetailRow label="Last Updated" value={formatDate(transaction.updatedAt)} />
              ) : null}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

