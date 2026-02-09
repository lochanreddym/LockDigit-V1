import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ScreenWrapper, Header } from "@/components/common";
import { GlassCard, GlassButton } from "@/components/glass";
import { DocumentCard } from "@/components/documents";
import { BillCard } from "@/components/payments";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";

export default function HomeScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();

  // Convert string userId to Convex Id type
  const convexUserId = userId as Id<"users"> | null;

  // Fetch data from Convex
  const user = useQuery(
    api.users.getById,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const documents = useQuery(
    api.documents.listByUser,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const upcomingBills = useQuery(
    api.bills.getUpcomingBills,
    convexUserId ? { userId: convexUserId, daysAhead: 7 } : "skip"
  );
  const totalDue = useQuery(
    api.bills.getTotalDue,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  const recentDocs = documents?.slice(0, 3) ?? [];

  return (
    <ScreenWrapper>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
          <View>
            <Text className="text-white/60 text-sm">Welcome back</Text>
            <Text className="text-white text-xl font-bold">
              {user?.name || "User"}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.push("/(app)/search")}
              className="w-10 h-10 rounded-full bg-white/5 items-center justify-center"
            >
              <Ionicons name="search" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/(app)/(tabs)/notifications")}
              className="w-10 h-10 rounded-full bg-white/5 items-center justify-center relative"
            >
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
              {(unreadCount ?? 0) > 0 && (
                <View className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Scan to Pay Banner */}
        <TouchableOpacity
          onPress={() => router.push("/(app)/scan-to-pay")}
          activeOpacity={0.8}
          className="mx-5 mb-5"
        >
          <GlassCard className="overflow-hidden" noPadding>
            <View className="bg-primary/10 p-5 flex-row items-center">
              <View className="w-14 h-14 rounded-2xl bg-primary items-center justify-center mr-4">
                <Ionicons name="qr-code" size={28} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-lg">
                  Scan to Pay
                </Text>
                <Text className="text-white/60 text-sm mt-0.5">
                  Quick QR code payments at any merchant
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color="rgba(255,255,255,0.5)"
              />
            </View>
          </GlassCard>
        </TouchableOpacity>

        {/* Financial Overview */}
        <View className="px-5 mb-5">
          <GlassCard>
            <Text className="text-white/60 text-sm mb-1">Total Due</Text>
            <Text className="text-white text-3xl font-bold">
              {formatCurrency(totalDue ?? 0)}
            </Text>
            <View className="flex-row mt-4 gap-3">
              <TouchableOpacity
                onPress={() => router.push("/(app)/(tabs)/payments")}
                className="flex-1 bg-primary/20 rounded-xl py-3 items-center"
              >
                <Text className="text-primary font-semibold text-sm">
                  Pay Bills
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/(app)/(tabs)/wallet")}
                className="flex-1 bg-secondary/20 rounded-xl py-3 items-center"
              >
                <Text className="text-secondary font-semibold text-sm">
                  View Wallet
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>

        {/* Upcoming Bills */}
        {upcomingBills && upcomingBills.length > 0 && (
          <View className="px-5 mb-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-semibold text-lg">
                Upcoming Bills
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(app)/(tabs)/payments")}
              >
                <Text className="text-primary text-sm">See All</Text>
              </TouchableOpacity>
            </View>
            {upcomingBills.slice(0, 3).map((bill) => (
              <BillCard
                key={bill._id}
                title={bill.title}
                category={bill.category}
                amount={bill.amount}
                dueDate={bill.dueDate}
                status={bill.status}
                recurring={bill.recurring}
                onPress={() =>
                  router.push({
                    pathname: "/(app)/bill/[id]",
                    params: { id: bill._id },
                  })
                }
              />
            ))}
          </View>
        )}

        {/* Recent Documents */}
        <View className="px-5 mb-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white font-semibold text-lg">
              Your Documents
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(app)/(tabs)/wallet")}
            >
              <Text className="text-primary text-sm">See All</Text>
            </TouchableOpacity>
          </View>
          {recentDocs.length > 0 ? (
            recentDocs.map((doc) => (
              <DocumentCard
                key={doc._id}
                id={doc._id}
                title={doc.title}
                type={doc.type}
                issuer={doc.issuer}
                expiryDate={doc.expiryDate}
                verified={doc.verified}
                frontImageUrl={doc.frontImageUrl}
                onPress={() =>
                  router.push({
                    pathname: "/(app)/document/[id]",
                    params: { id: doc._id },
                  })
                }
              />
            ))
          ) : (
            <GlassCard>
              <View className="items-center py-4">
                <Ionicons
                  name="documents-outline"
                  size={36}
                  color="rgba(255,255,255,0.3)"
                />
                <Text className="text-white/50 text-sm mt-2">
                  No documents yet
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(app)/(tabs)/wallet")}
                  className="mt-3"
                >
                  <Text className="text-primary text-sm font-semibold">
                    Add Your First Document
                  </Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          )}
        </View>

        {/* Quick Actions */}
        <View className="px-5 mb-5">
          <Text className="text-white font-semibold text-lg mb-3">
            Quick Actions
          </Text>
          <View className="flex-row gap-3">
            {[
              {
                icon: "add-circle-outline" as const,
                label: "Add Document",
                onPress: () => router.push("/(app)/(tabs)/wallet"),
              },
              {
                icon: "receipt-outline" as const,
                label: "Add Bill",
                onPress: () => router.push("/(app)/(tabs)/payments"),
              },
              {
                icon: "qr-code-outline" as const,
                label: "Scan & Pay",
                onPress: () => router.push("/(app)/scan-to-pay"),
              },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                onPress={action.onPress}
                className="flex-1"
                activeOpacity={0.8}
              >
                <GlassCard className="items-center py-4">
                  <Ionicons name={action.icon} size={28} color="#6C63FF" />
                  <Text className="text-white/70 text-xs mt-2 text-center">
                    {action.label}
                  </Text>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
