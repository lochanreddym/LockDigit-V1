import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatCurrency } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";
import * as Clipboard from "expo-clipboard";

function formatReceiptDate(timestamp: number): string {
  const d = new Date(timestamp);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${month}/${day}/${year} at ${hours}:${minutes} ${ampm}`;
}

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const transaction = useQuery(
    api.payments.getTransactionById,
    transactionId
      ? { transactionId: transactionId as Id<"transactions"> }
      : "skip"
  );

  const copyToClipboard = async (text: string, field: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleShareReceipt = async () => {
    if (!transaction) return;
    const date = transaction.completedAt
      ? formatReceiptDate(transaction.completedAt)
      : formatReceiptDate(transaction.createdAt);
    const text = [
      "--- LockDigit Payment Receipt ---",
      "",
      `Status: Transaction Successful`,
      `Date: ${date}`,
      "",
      `Paid to: ${transaction.merchantName || "Merchant"}`,
      `Amount: ${formatCurrency(transaction.amount)}`,
      `Payment Method: ${transaction.paymentMethod || "Card"}`,
      "",
      `Transaction ID: ${transaction.paymentToken}`,
      transaction.verificationToken
        ? `Verification: ${transaction.verificationToken}`
        : "",
      "",
      "Powered by LockDigit · Stripe",
    ]
      .filter(Boolean)
      .join("\n");

    await Share.share({ message: text, title: "Payment Receipt" });
  };

  if (!transaction) {
    return (
      <View className="flex-1 bg-ios-bg items-center justify-center">
        <Text className="text-ios-grey4">Loading receipt...</Text>
      </View>
    );
  }

  const completedDate = transaction.completedAt
    ? formatReceiptDate(transaction.completedAt)
    : formatReceiptDate(transaction.createdAt);

  return (
    <View className="flex-1 bg-ios-bg">
      {/* Green header */}
      <LinearGradient
        colors={["#1B8C3A", "#28A745"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={["top"]}>
          <View className="px-5 pt-2 pb-5">
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => router.replace("/(app)/(tabs)/home")}
                className="p-1 mr-3"
              >
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View className="flex-1 items-center mr-9">
                <Text className="text-white text-lg font-bold">
                  Transaction Successful
                </Text>
                <Text className="text-white/70 text-xs mt-0.5">
                  {completedDate}
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Checkmark */}
        <View className="items-center mt-6 mb-5">
          <LinearGradient
            colors={["#28A745", "#1B8C3A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="w-24 h-24 rounded-full items-center justify-center"
            style={styles.successShadow}
          >
            <Ionicons name="checkmark" size={56} color="#FFFFFF" />
          </LinearGradient>
        </View>

        {/* Payment summary card */}
        <View className="mx-5">
          <View
            className="bg-white rounded-2xl border border-ios-border overflow-hidden"
            style={styles.cardShadow}
          >
            {/* Paid to section */}
            <View className="flex-row items-center px-4 py-4">
              <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                <Ionicons name="storefront" size={20} color="#0A84FF" />
              </View>
              <View className="flex-1">
                <Text className="text-ios-grey4 text-xs">Paid to</Text>
                <Text className="text-ios-dark text-base font-bold">
                  {transaction.merchantName || "Merchant"}
                </Text>
                {transaction.recipientPhone && (
                  <Text className="text-ios-grey4 text-xs mt-0.5">
                    {transaction.recipientPhone}
                  </Text>
                )}
              </View>
              <Text className="text-ios-dark text-xl font-bold">
                {formatCurrency(transaction.amount)}
              </Text>
            </View>

            <View className="border-t border-ios-border mx-4" />

            {/* Payment method */}
            <View className="flex-row justify-between px-4 py-3">
              <Text className="text-ios-grey4 text-sm">Payment Method</Text>
              <Text className="text-ios-dark text-sm font-medium">
                {transaction.paymentMethod || "Card"}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment details card */}
        <View className="mx-5 mt-4">
          <TouchableOpacity
            onPress={() => setDetailsExpanded(!detailsExpanded)}
            activeOpacity={0.7}
          >
            <View
              className="bg-white rounded-2xl border border-ios-border overflow-hidden"
              style={styles.cardShadow}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between px-4 py-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-lg bg-ios-bg items-center justify-center mr-2.5">
                    <Ionicons
                      name="document-text-outline"
                      size={18}
                      color="#8E8E93"
                    />
                  </View>
                  <Text className="text-ios-dark text-base font-semibold">
                    Payment Details
                  </Text>
                </View>
                <Ionicons
                  name={detailsExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#8E8E93"
                />
              </View>

              {detailsExpanded && (
                <View className="px-4 pb-4">
                  <View className="border-t border-ios-border mb-3" />

                  {/* Transaction ID */}
                  <View className="mb-3">
                    <Text className="text-ios-grey4 text-xs mb-1">
                      Transaction ID
                    </Text>
                    <View className="flex-row items-center justify-between">
                      <Text
                        className="text-ios-dark text-sm font-medium flex-1 mr-2"
                        numberOfLines={1}
                      >
                        {transaction.paymentToken}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          copyToClipboard(
                            transaction.paymentToken,
                            "transactionId"
                          )
                        }
                      >
                        <Ionicons
                          name={
                            copiedField === "transactionId"
                              ? "checkmark-circle"
                              : "copy-outline"
                          }
                          size={20}
                          color={
                            copiedField === "transactionId"
                              ? "#30D158"
                              : "#0A84FF"
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Description */}
                  <View className="mb-3">
                    <Text className="text-ios-grey4 text-xs mb-1">
                      Description
                    </Text>
                    <Text className="text-ios-dark text-sm font-medium">
                      {transaction.description}
                    </Text>
                  </View>

                  {/* Status */}
                  <View className="mb-3">
                    <Text className="text-ios-grey4 text-xs mb-1">Status</Text>
                    <View className="flex-row items-center">
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#30D158"
                      />
                      <Text className="text-success text-sm font-medium ml-1">
                        Completed
                      </Text>
                    </View>
                  </View>

                  {/* Verification token */}
                  {transaction.verificationToken && (
                    <View>
                      <Text className="text-ios-grey4 text-xs mb-1">
                        Verification
                      </Text>
                      <View className="flex-row items-center justify-between">
                        <Text
                          className="text-ios-grey4 text-xs font-mono flex-1 mr-2"
                          numberOfLines={1}
                        >
                          {transaction.verificationToken}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            copyToClipboard(
                              transaction.verificationToken!,
                              "verification"
                            )
                          }
                        >
                          <Ionicons
                            name={
                              copiedField === "verification"
                                ? "checkmark-circle"
                                : "copy-outline"
                            }
                            size={18}
                            color={
                              copiedField === "verification"
                                ? "#30D158"
                                : "#8E8E93"
                            }
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Action buttons row */}
        <View className="flex-row justify-center gap-8 mt-6 mx-5">
          <TouchableOpacity
            onPress={() => router.replace("/(app)/my-wallet")}
            className="items-center"
          >
            <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-1.5">
              <Ionicons name="wallet-outline" size={24} color="#0A84FF" />
            </View>
            <Text className="text-ios-dark text-xs font-medium">
              Check Balance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace("/(app)/(tabs)/payments")}
            className="items-center"
          >
            <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-1.5">
              <Ionicons
                name="swap-horizontal-outline"
                size={24}
                color="#0A84FF"
              />
            </View>
            <Text className="text-ios-dark text-xs font-medium">
              View History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShareReceipt}
            className="items-center"
          >
            <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-1.5">
              <Ionicons
                name="share-social-outline"
                size={24}
                color="#0A84FF"
              />
            </View>
            <Text className="text-ios-dark text-xs font-medium">
              Share Receipt
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contact support */}
        <View className="mx-5 mt-6">
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "LockDigit Support",
                "For help with this transaction, email support@lockdigit.com or call 1-800-LOCKDIGIT."
              )
            }
            className="bg-white rounded-2xl border border-ios-border px-4 py-3.5 flex-row items-center"
            style={styles.cardShadow}
          >
            <View className="w-8 h-8 rounded-full bg-ios-bg items-center justify-center mr-3">
              <Ionicons
                name="help-circle-outline"
                size={20}
                color="#8E8E93"
              />
            </View>
            <Text className="text-ios-dark text-base flex-1">
              Contact LockDigit Support
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="items-center mt-6 mb-4">
          <Text className="text-ios-grey4 text-xs">
            Powered by LockDigit · Stripe
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  successShadow: {
    shadowColor: "#28A745",
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
});
