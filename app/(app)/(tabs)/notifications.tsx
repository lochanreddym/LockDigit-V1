import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState } from "@/components/common";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";

const notificationIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  bill_due: "receipt-outline",
  doc_expiry: "document-outline",
  subsidy: "gift-outline",
  payment_success: "checkmark-circle-outline",
  system: "information-circle-outline",
};

const notificationColors: Record<string, string> = {
  bill_due: "#FF9500",
  doc_expiry: "#FF3B30",
  subsidy: "#30D158",
  payment_success: "#30D158",
  system: "#0A84FF",
};

export default function NotificationsScreen() {
  const { userId } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;

  const notifications = useQuery(
    api.notifications.listByUser,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  const handleMarkAllRead = async () => {
    if (!convexUserId) return;
    await markAllAsRead({ userId: convexUserId });
  };

  const handleNotificationPress = async (notificationId: Id<"notifications">) => {
    await markAsRead({ notificationId });
  };

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="bg-white border-b border-ios-border px-5 py-3">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-ios-dark">
                Notifications
              </Text>
              <Text className="text-ios-grey4 text-sm mt-0.5">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </Text>
            </View>
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={handleMarkAllRead}
                className="px-3 py-1.5 rounded-full bg-primary/10"
              >
                <Text className="text-primary text-xs font-semibold">
                  Mark All Read
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {notifications && notifications.length > 0 ? (
            notifications.map((notification) => (
              <TouchableOpacity
                key={notification._id}
                onPress={() => handleNotificationPress(notification._id)}
                activeOpacity={0.8}
              >
                <View
                  className={`mb-3 bg-white rounded-3xl border p-4 ${
                    !notification.read
                      ? "border-primary/20"
                      : "border-ios-border"
                  }`}
                  style={styles.cardShadow}
                >
                  <View className="flex-row items-start">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{
                        backgroundColor: `${notificationColors[notification.type]}12`,
                      }}
                    >
                      <Ionicons
                        name={
                          notificationIcons[notification.type] ||
                          "notifications-outline"
                        }
                        size={20}
                        color={notificationColors[notification.type]}
                      />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text
                          className={`font-semibold flex-1 ${
                            notification.read
                              ? "text-ios-grey4"
                              : "text-ios-dark"
                          }`}
                        >
                          {notification.title}
                        </Text>
                        {!notification.read && (
                          <View className="w-2.5 h-2.5 rounded-full bg-primary ml-2" />
                        )}
                      </View>
                      <Text className="text-ios-grey4 text-sm mt-1">
                        {notification.body}
                      </Text>
                      <Text className="text-ios-grey3 text-xs mt-2">
                        {formatDate(notification.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <EmptyState
              icon="notifications-outline"
              title="No Notifications"
              description="You're all caught up! We'll notify you about bills, document expiries, and more."
            />
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
