import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "@/components/glass";
import { formatCurrency, formatDate, getDaysUntil } from "@/lib/utils";

interface BillCardProps {
  title: string;
  category: string;
  amount: number;
  dueDate: number;
  status: "pending" | "paid" | "overdue";
  recurring?: boolean;
  onPress: () => void;
}

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  electricity: "flash-outline",
  water: "water-outline",
  internet: "wifi-outline",
  phone: "call-outline",
  rent: "home-outline",
  insurance: "shield-outline",
  loan: "cash-outline",
  subscription: "repeat-outline",
  other: "receipt-outline",
};

const statusColors = {
  pending: "text-warning",
  paid: "text-success",
  overdue: "text-danger",
};

const statusBgColors = {
  pending: "bg-warning/20",
  paid: "bg-success/20",
  overdue: "bg-danger/20",
};

export function BillCard({
  title,
  category,
  amount,
  dueDate,
  status,
  recurring,
  onPress,
}: BillCardProps) {
  const daysUntil = getDaysUntil(dueDate);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <GlassCard className="mb-3">
        <View className="flex-row items-center">
          <View className="w-12 h-12 rounded-xl bg-primary/20 items-center justify-center mr-4">
            <Ionicons
              name={categoryIcons[category] || "receipt-outline"}
              size={24}
              color="#6C63FF"
            />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-white font-semibold text-base flex-1" numberOfLines={1}>
                {title}
              </Text>
              {recurring && (
                <Ionicons
                  name="repeat"
                  size={14}
                  color="rgba(255, 255, 255, 0.4)"
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>

            <View className="flex-row items-center mt-1">
              <View className={`px-2 py-0.5 rounded-full ${statusBgColors[status]}`}>
                <Text className={`text-xs font-medium capitalize ${statusColors[status]}`}>
                  {status}
                </Text>
              </View>
              {status === "pending" && daysUntil > 0 && (
                <Text className="text-white/40 text-xs ml-2">
                  Due in {daysUntil} day{daysUntil !== 1 ? "s" : ""}
                </Text>
              )}
              {status === "pending" && daysUntil === 0 && (
                <Text className="text-warning text-xs ml-2">Due today</Text>
              )}
            </View>
          </View>

          <View className="items-end ml-3">
            <Text className="text-white font-bold text-base">
              {formatCurrency(amount)}
            </Text>
            <Text className="text-white/40 text-xs mt-0.5">
              {formatDate(dueDate)}
            </Text>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}
