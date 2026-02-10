import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useAction } from "convex/react";
import { useConfirmPayment } from "@/lib/stripe-native";
import { api } from "@/convex/_generated/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassButton } from "@/components/glass";
import { formatCurrency, formatDate, getDaysUntil } from "@/lib/utils";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";

export default function BillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userId } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;
  const { confirmPayment } = useConfirmPayment();

  const [paying, setPaying] = useState(false);

  const billId = id as Id<"bills">;
  const bill = useQuery(api.bills.getById, { billId });
  const markPaid = useMutation(api.bills.markPaid);
  const removeBill = useMutation(api.bills.remove);
  const createPaymentIntent = useAction(api.payments.createPaymentIntent);

  if (!bill) {
    return (
      <View className="flex-1 bg-ios-bg">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center px-5 py-3 bg-white border-b border-ios-border">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
              <Ionicons name="chevron-back" size={24} color="#0A84FF" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-ios-dark">Bill Details</Text>
          </View>
          <View className="flex-1 items-center justify-center">
            <Text className="text-ios-grey4">Loading bill...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const daysUntil = getDaysUntil(bill.dueDate);

  const handlePayBill = async () => {
    if (!convexUserId) return;

    setPaying(true);
    try {
      const { clientSecret, paymentIntentId } = await createPaymentIntent({
        amount: bill.amount,
        currency: "usd",
        userId: convexUserId,
        description: `Bill payment: ${bill.title}`,
      });

      const { error } = await confirmPayment(clientSecret, {
        paymentMethodType: "Card",
      });

      if (error) {
        Alert.alert("Payment Failed", error.message);
      } else {
        await markPaid({
          billId,
          stripePaymentIntentId: paymentIntentId,
        });
        Alert.alert("Payment Successful", `${bill.title} has been paid.`);
      }
    } catch (error: any) {
      Alert.alert(
        "Payment Error",
        error?.message || "An error occurred during payment."
      );
    } finally {
      setPaying(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Bill", "Are you sure you want to delete this bill?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await removeBill({ billId });
          router.back();
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-3 bg-white border-b border-ios-border">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
              <Ionicons name="chevron-back" size={24} color="#0A84FF" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-ios-dark">Bill Details</Text>
          </View>
          <TouchableOpacity onPress={handleDelete} className="p-2">
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Amount Card */}
          <View
            className="bg-white rounded-3xl border border-ios-border items-center py-8 px-5 mb-5"
            style={styles.cardShadow}
          >
            <Text className="text-ios-grey4 text-sm mb-1">Amount Due</Text>
            <Text className="text-ios-dark text-4xl font-bold">
              {formatCurrency(bill.amount)}
            </Text>

            {/* Status badge */}
            <View
              className={`mt-3 px-4 py-1.5 rounded-full ${
                bill.status === "paid"
                  ? "bg-success/10"
                  : bill.status === "overdue"
                    ? "bg-danger/10"
                    : "bg-warning/10"
              }`}
            >
              <Text
                className={`text-sm font-semibold capitalize ${
                  bill.status === "paid"
                    ? "text-success"
                    : bill.status === "overdue"
                      ? "text-danger"
                      : "text-warning"
                }`}
              >
                {bill.status}
              </Text>
            </View>

            {/* Due date warning */}
            {bill.status !== "paid" && (
              <View className="flex-row items-center mt-3">
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={
                    daysUntil <= 0
                      ? "#FF3B30"
                      : daysUntil <= 3
                        ? "#FF9500"
                        : "#8E8E93"
                  }
                />
                <Text
                  className={`ml-1.5 text-sm ${
                    daysUntil <= 0
                      ? "text-danger"
                      : daysUntil <= 3
                        ? "text-warning"
                        : "text-ios-grey4"
                  }`}
                >
                  {daysUntil <= 0
                    ? "Overdue"
                    : daysUntil === 0
                      ? "Due today"
                      : `Due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`}
                </Text>
              </View>
            )}
          </View>

          {/* Bill Details */}
          <View
            className="bg-white rounded-3xl border border-ios-border p-5 mb-5"
            style={styles.cardShadow}
          >
            <Text className="text-ios-dark font-semibold text-lg mb-4">
              Details
            </Text>
            {[
              { label: "Bill Name", value: bill.title },
              { label: "Category", value: bill.category },
              { label: "Due Date", value: formatDate(bill.dueDate) },
              {
                label: "Recurring",
                value: bill.recurring
                  ? `Yes (${bill.recurrenceInterval || "monthly"})`
                  : "No",
              },
              ...(bill.paidAt
                ? [{ label: "Paid On", value: formatDate(bill.paidAt) }]
                : []),
              {
                label: "Created",
                value: formatDate(bill.createdAt),
              },
            ].map((item) => (
              <View
                key={item.label}
                className="flex-row items-center justify-between py-3 border-b border-ios-border"
              >
                <Text className="text-ios-grey4 text-sm">{item.label}</Text>
                <Text className="text-ios-dark text-sm font-medium capitalize">
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Pay Button */}
          {bill.status !== "paid" && (
            <GlassButton
              title={paying ? "Processing Payment..." : `Pay ${formatCurrency(bill.amount)}`}
              onPress={handlePayBill}
              loading={paying}
              size="lg"
              fullWidth
              icon={<Ionicons name="card" size={20} color="#FFFFFF" />}
              className="mb-4"
            />
          )}

          {bill.status === "paid" && (
            <View
              className="bg-white rounded-3xl border border-ios-border p-4 mb-4"
              style={styles.cardShadow}
            >
              <View className="flex-row items-center justify-center py-2">
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color="#30D158"
                />
                <Text className="text-success font-semibold ml-2 text-lg">
                  Paid Successfully
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
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
