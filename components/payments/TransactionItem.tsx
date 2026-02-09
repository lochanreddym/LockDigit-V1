import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency, formatDate } from "@/lib/utils";

interface TransactionItemProps {
  type: "payment" | "scan_to_pay" | "bill_payment";
  amount: number;
  description: string;
  merchantName?: string;
  status: "pending" | "completed" | "failed";
  createdAt: number;
}

const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  payment: "card-outline",
  scan_to_pay: "qr-code-outline",
  bill_payment: "receipt-outline",
};

const statusIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  pending: "time-outline",
  completed: "checkmark-circle-outline",
  failed: "close-circle-outline",
};

export function TransactionItem({
  type,
  amount,
  description,
  merchantName,
  status,
  createdAt,
}: TransactionItemProps) {
  return (
    <View className="flex-row items-center py-3 border-b border-white/5">
      <View
        className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
          status === "completed"
            ? "bg-success/20"
            : status === "failed"
              ? "bg-danger/20"
              : "bg-warning/20"
        }`}
      >
        <Ionicons
          name={typeIcons[type]}
          size={20}
          color={
            status === "completed"
              ? "#00C853"
              : status === "failed"
                ? "#FF3D71"
                : "#FFB300"
          }
        />
      </View>

      <View className="flex-1">
        <Text className="text-white text-sm font-medium" numberOfLines={1}>
          {merchantName || description}
        </Text>
        <View className="flex-row items-center mt-0.5">
          <Ionicons
            name={statusIcons[status]}
            size={12}
            color={
              status === "completed"
                ? "#00C853"
                : status === "failed"
                  ? "#FF3D71"
                  : "#FFB300"
            }
          />
          <Text className="text-white/40 text-xs ml-1 capitalize">
            {status}
          </Text>
          <Text className="text-white/20 text-xs mx-1">|</Text>
          <Text className="text-white/40 text-xs">{formatDate(createdAt)}</Text>
        </View>
      </View>

      <Text
        className={`font-semibold ${
          status === "failed" ? "text-white/30" : "text-white"
        }`}
      >
        -{formatCurrency(amount)}
      </Text>
    </View>
  );
}
