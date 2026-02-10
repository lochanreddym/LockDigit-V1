import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { DocumentCard } from "@/components/documents";
import { BillCard } from "@/components/payments";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";

const CATEGORIES = [
  { icon: "id-card-outline", label: "Government IDs", color: "#0A84FF" },
  { icon: "school-outline", label: "Education", color: "#5E5CE6" },
  { icon: "card-outline", label: "Banking", color: "#30D158" },
  { icon: "medkit-outline", label: "Healthcare", color: "#FF3B30" },
  { icon: "car-outline", label: "Driving", color: "#FF9500" },
  { icon: "globe-outline", label: "Travel", color: "#0A84FF" },
  { icon: "shield-outline", label: "Insurance", color: "#5E5CE6" },
  { icon: "business-outline", label: "Employment", color: "#30D158" },
  { icon: "home-outline", label: "Property", color: "#FF9500" },
  { icon: "receipt-outline", label: "Tax & Finance", color: "#FF3B30" },
  { icon: "trophy-outline", label: "Certificates", color: "#0A84FF" },
  { icon: "document-outline", label: "Other", color: "#8E8E93" },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();

  const convexUserId = userId as Id<"users"> | null;

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
  const verifiedCount = documents?.filter((d) => d.verified).length ?? 0;

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
            <View>
              <Text className="text-ios-grey4 text-sm">Welcome back</Text>
              <Text className="text-ios-dark text-xl font-bold">
                {user?.name || "User"}
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => router.push("/(app)/search")}
                className="w-10 h-10 rounded-full bg-ios-bg border border-ios-border items-center justify-center"
              >
                <Ionicons name="search" size={20} color="#1C1C1E" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/(app)/scan-to-pay")}
                className="w-10 h-10 rounded-full bg-primary items-center justify-center"
                style={styles.scanShadow}
              >
                <Ionicons name="qr-code" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Card */}
          <View className="px-5 mb-5">
            <LinearGradient
              colors={["#0A84FF", "#5E5CE6", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-3xl overflow-hidden"
              style={styles.heroShadow}
            >
              {/* Decorative shapes */}
              <View className="absolute top-4 right-4 w-24 h-24 rounded-2xl bg-white/10 rotate-12" />
              <View className="absolute bottom-4 left-8 w-16 h-16 rounded-xl bg-white/5 -rotate-12" />

              <View className="p-5">
                <View className="flex-row items-center mb-3">
                  <View className="w-3 h-3 rounded-full bg-white/60 mr-2" />
                  <Text className="text-white/80 text-sm">
                    {verifiedCount > 0 ? "Identity Verified" : "Not Yet Verified"}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-white text-2xl font-bold">
                      {user?.name || "User"}
                    </Text>
                    <Text className="text-white/70 text-sm mt-1">
                      {documents?.length ?? 0} documents | {verifiedCount} verified
                    </Text>
                  </View>

                  {/* Avatar */}
                  <View className="w-14 h-14 rounded-full bg-white/20 items-center justify-center">
                    <Text className="text-white text-xl font-bold">
                      {(user?.name || "U").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Quick Stats */}
                <View className="flex-row mt-4 gap-3">
                  <View className="flex-1 bg-white/15 rounded-2xl py-3 px-4">
                    <Text className="text-white/70 text-xs">Total Due</Text>
                    <Text className="text-white text-lg font-bold">
                      {formatCurrency(totalDue ?? 0)}
                    </Text>
                  </View>
                  <View className="flex-1 bg-white/15 rounded-2xl py-3 px-4">
                    <Text className="text-white/70 text-xs">Notifications</Text>
                    <Text className="text-white text-lg font-bold">
                      {unreadCount ?? 0} new
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Quick Actions */}
          <View className="px-5 mb-5">
            <Text className="text-ios-dark font-semibold text-lg mb-3">
              Quick Actions
            </Text>
            <View className="flex-row gap-3">
              {[
                {
                  icon: "receipt-outline" as const,
                  label: "Pay a Bill",
                  color: "#0A84FF",
                  onPress: () => router.push("/(app)/(tabs)/payments"),
                },
                {
                  icon: "shield-checkmark-outline" as const,
                  label: "Verified Credentials",
                  color: "#30D158",
                  onPress: () => router.push("/(app)/(tabs)/wallet"),
                },
                {
                  icon: "card-outline" as const,
                  label: "Manage Payments",
                  color: "#5E5CE6",
                  onPress: () => router.push("/(app)/(tabs)/payments"),
                },
              ].map((action) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={action.onPress}
                  className="flex-1"
                  activeOpacity={0.8}
                >
                  <View
                    className="bg-white rounded-3xl border border-ios-border p-4 items-center"
                    style={styles.actionCard}
                  >
                    <View
                      className="w-12 h-12 rounded-2xl items-center justify-center mb-2"
                      style={{ backgroundColor: `${action.color}15` }}
                    >
                      <Ionicons name={action.icon} size={24} color={action.color} />
                    </View>
                    <Text className="text-ios-dark text-xs font-medium text-center">
                      {action.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Categories Grid */}
          <View className="px-5 mb-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-ios-dark font-semibold text-lg">
                Categories
              </Text>
              <TouchableOpacity onPress={() => router.push("/(app)/categories")}>
                <Text className="text-primary text-sm">See All</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {CATEGORIES.slice(0, 8).map((cat) => (
                <TouchableOpacity
                  key={cat.label}
                  className="items-center"
                  style={{ width: "22%" }}
                  activeOpacity={0.7}
                >
                  <View
                    className="w-14 h-14 rounded-2xl items-center justify-center mb-1.5"
                    style={{ backgroundColor: `${cat.color}12` }}
                  >
                    <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                  </View>
                  <Text className="text-ios-dark text-[10px] text-center font-medium" numberOfLines={1}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Upcoming Bills */}
          {upcomingBills && upcomingBills.length > 0 && (
            <View className="px-5 mb-5">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-ios-dark font-semibold text-lg">
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
              <Text className="text-ios-dark font-semibold text-lg">
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
              <View
                className="bg-white rounded-3xl border border-ios-border p-5"
                style={styles.actionCard}
              >
                <View className="items-center py-4">
                  <Ionicons
                    name="documents-outline"
                    size={36}
                    color="#C7C7CC"
                  />
                  <Text className="text-ios-grey4 text-sm mt-2">
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
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroShadow: {
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  scanShadow: {
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionCard: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
});
