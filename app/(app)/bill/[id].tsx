import React, { useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useAction } from "convex/react";
import { useConfirmPayment } from "@/lib/stripe-native";
import { api } from "@/convex/_generated/api";
import { ScreenWrapper, Header } from "@/components/common";
import { GlassCard, GlassButton } from "@/components/glass";
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
      <ScreenWrapper>
        <Header title="Bill Details" showBack />
        <View className="flex-1 items-center justify-center">
          <Text className="text-white/50">Loading bill...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const daysUntil = getDaysUntil(bill.dueDate);

  const handlePayBill = async () => {
    if (!convexUserId) return;

    setPaying(true);
    try {
      // Create a PaymentIntent via Convex
      const { clientSecret, paymentIntentId } = await createPaymentIntent({
        amount: bill.amount,
        currency: "usd",
        userId: convexUserId,
        description: `Bill payment: ${bill.title}`,
      });

      // Confirm the payment using Stripe SDK
      const { error } = await confirmPayment(clientSecret, {
        paymentMethodType: "Card",
      });

      if (error) {
        Alert.alert("Payment Failed", error.message);
      } else {
        // Mark bill as paid
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
    <ScreenWrapper>
      <Header
        title="Bill Details"
        showBack
        rightAction={{
          icon: "trash-outline",
          onPress: handleDelete,
        }}
      />

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Amount Card */}
        <GlassCard className="mb-5 items-center py-6">
          <Text className="text-white/60 text-sm mb-1">Amount Due</Text>
          <Text className="text-white text-4xl font-bold">
            {formatCurrency(bill.amount)}
          </Text>

          {/* Status badge */}
          <View
            className={`mt-3 px-4 py-1.5 rounded-full ${
              bill.status === "paid"
                ? "bg-success/20"
                : bill.status === "overdue"
                  ? "bg-danger/20"
                  : "bg-warning/20"
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
                    ? "#FF3D71"
                    : daysUntil <= 3
                      ? "#FFB300"
                      : "rgba(255,255,255,0.5)"
                }
              />
              <Text
                className={`ml-1.5 text-sm ${
                  daysUntil <= 0
                    ? "text-danger"
                    : daysUntil <= 3
                      ? "text-warning"
                      : "text-white/50"
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
        </GlassCard>

        {/* Bill Details */}
        <GlassCard className="mb-5">
          <Text className="text-white font-semibold text-lg mb-4">
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
              className="flex-row items-center justify-between py-3 border-b border-white/5"
            >
              <Text className="text-white/50 text-sm">{item.label}</Text>
              <Text className="text-white text-sm font-medium capitalize">
                {item.value}
              </Text>
            </View>
          ))}
        </GlassCard>

        {/* Pay Button */}
        {bill.status !== "paid" && (
          <GlassButton
            title={paying ? "Processing Payment..." : `Pay ${formatCurrency(bill.amount)}`}
            onPress={handlePayBill}
            loading={paying}
            size="lg"
            icon={<Ionicons name="card" size={20} color="#FFFFFF" />}
            className="mb-4"
          />
        )}

        {bill.status === "paid" && (
          <GlassCard className="mb-4">
            <View className="flex-row items-center justify-center py-2">
              <Ionicons
                name="checkmark-circle"
                size={24}
                color="#00C853"
              />
              <Text className="text-success font-semibold ml-2 text-lg">
                Paid Successfully
              </Text>
            </View>
          </GlassCard>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
