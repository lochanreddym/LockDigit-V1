import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency, formatDate } from "@/lib/utils";

interface TransactionItemProps {
  type: "payment" | "scan_to_pay" | "bill_payment" | "transfer" | "wire_transfer";
  amount: number;
  description: string;
  merchantName?: string;
  status: "pending" | "completed" | "failed";
  createdAt: number;
  senderName?: string;
  transactionId?: string;
}

const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  payment: "card-outline",
  scan_to_pay: "qr-code-outline",
  bill_payment: "receipt-outline",
  transfer: "swap-horizontal-outline",
  wire_transfer: "arrow-redo-outline",
};

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

export function TransactionItem({
  type,
  amount,
  description,
  merchantName,
  status,
  createdAt,
  senderName,
  transactionId,
}: TransactionItemProps) {
  const sender = senderName || "User";

  return (
    <View className="flex-row items-center py-3 border-b border-ios-border">
      <View
        className="w-12 h-12 rounded-2xl items-center justify-center mr-3"
        style={{ backgroundColor: `${statusColors[status]}15` }}
      >
        <Ionicons
          name={typeIcons[type]}
          size={20}
          color={statusColors[status]}
        />
      </View>

      <View className="flex-1">
        <Text className="text-ios-dark text-sm font-medium" numberOfLines={1}>
          {sender}
        </Text>
        <Text className="text-ios-grey4 text-xs mt-0.5" numberOfLines={1}>
          {transactionId ? `Transaction ID: ${transactionId}` : merchantName || description}
        </Text>
        <View className="flex-row items-center mt-0.5">
          <View
            className="w-1.5 h-1.5 rounded-full mr-1.5"
            style={{ backgroundColor: statusColors[status] }}
          />
          <Text
            className="text-xs"
            style={{ color: statusColors[status] }}
          >
            {statusLabels[status] ?? "Pending"}
          </Text>
          <View className="w-1 h-1 rounded-full bg-ios-grey3 mx-2" />
          <Text className="text-ios-grey4 text-xs">{formatDate(createdAt)}</Text>
        </View>
      </View>

      <Text
        className={`font-semibold ${
          status === "failed" ? "text-ios-grey3" : "text-ios-dark"
        }`}
      >
        -{formatCurrency(amount)}
      </Text>
    </View>
  );
}
