import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ScreenWrapper, Header, EmptyState } from "@/components/common";
import { GlassCard, GlassButton } from "@/components/glass";
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
  bill_due: "#FFB300",
  doc_expiry: "#FF3D71",
  subsidy: "#00C853",
  payment_success: "#00C853",
  system: "#6C63FF",
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
    <ScreenWrapper>
      <Header
        title="Notifications"
        subtitle={
          unreadCount > 0 ? `${unreadCount} unread` : "All caught up"
        }
        rightComponent={
          unreadCount > 0 ? (
            <TouchableOpacity
              onPress={handleMarkAllRead}
              className="px-3 py-1.5 rounded-lg bg-primary/20"
            >
              <Text className="text-primary text-xs font-semibold">
                Mark All Read
              </Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        className="flex-1 px-5"
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
              <GlassCard
                className={`mb-3 ${!notification.read ? "border-primary/30" : ""}`}
              >
                <View className="flex-row items-start">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{
                      backgroundColor: `${notificationColors[notification.type]}20`,
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
                          notification.read ? "text-white/70" : "text-white"
                        }`}
                      >
                        {notification.title}
                      </Text>
                      {!notification.read && (
                        <View className="w-2.5 h-2.5 rounded-full bg-primary ml-2" />
                      )}
                    </View>
                    <Text className="text-white/50 text-sm mt-1">
                      {notification.body}
                    </Text>
                    <Text className="text-white/30 text-xs mt-2">
                      {formatDate(notification.createdAt)}
                    </Text>
                  </View>
                </View>
              </GlassCard>
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
    </ScreenWrapper>
  );
}
