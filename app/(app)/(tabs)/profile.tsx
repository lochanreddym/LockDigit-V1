import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ScreenWrapper, Header } from "@/components/common";
import { GlassCard } from "@/components/glass";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import * as SecureStoreHelper from "@/lib/secure-store";
import { signOutFirebase } from "@/lib/firebase";
import { maskString } from "@/lib/utils";

export default function ProfileScreen() {
  const router = useRouter();
  const { userId, logout: authLogout } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;

  const user = useQuery(
    api.users.getById,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const documents = useQuery(
    api.documents.listByUser,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const subscriptions = useQuery(
    api.subscriptions.getActiveByUser,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? You'll need to verify your phone number to sign back in.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOutFirebase();
              await SecureStoreHelper.clearAll();
              authLogout();
              router.replace("/(auth)/login");
            } catch (error) {
              console.error("Logout error:", error);
            }
          },
        },
      ]
    );
  };

  const menuSections = [
    {
      title: "Account",
      items: [
        {
          icon: "person-outline" as const,
          label: "Edit Profile",
          value: user?.name,
          onPress: () =>
            Alert.alert("Coming Soon", "Profile editing will be available in the next update."),
        },
        {
          icon: "call-outline" as const,
          label: "Phone Number",
          value: user?.phone ? maskString(user.phone) : "Not set",
          onPress: () => {},
        },
        {
          icon: "lock-closed-outline" as const,
          label: "Change PIN",
          onPress: () =>
            Alert.alert("Coming Soon", "PIN change will be available in the next update."),
        },
      ],
    },
    {
      title: "Wallet",
      items: [
        {
          icon: "documents-outline" as const,
          label: "Documents",
          value: `${documents?.length ?? 0} stored`,
          onPress: () => router.push("/(app)/(tabs)/wallet"),
        },
        {
          icon: "repeat-outline" as const,
          label: "Subscriptions",
          value: `${subscriptions?.length ?? 0} active`,
          onPress: () =>
            Alert.alert(
              "Coming Soon",
              "Subscription management will be available soon."
            ),
        },
        {
          icon: "card-outline" as const,
          label: "Payment Methods",
          onPress: () =>
            Alert.alert(
              "Coming Soon",
              "Payment method management will be available soon."
            ),
        },
      ],
    },
    {
      title: "Security",
      items: [
        {
          icon: "finger-print-outline" as const,
          label: "Biometric Login",
          value: "Coming soon",
          onPress: () => {},
        },
        {
          icon: "phone-portrait-outline" as const,
          label: "Device Binding",
          value: "Active",
          onPress: () =>
            Alert.alert(
              "Device Binding",
              "Your account is bound to this device for security. To transfer, you'll need to re-verify."
            ),
        },
      ],
    },
    {
      title: "About",
      items: [
        {
          icon: "shield-outline" as const,
          label: "Privacy Policy",
          onPress: () => {},
        },
        {
          icon: "document-text-outline" as const,
          label: "Terms of Service",
          onPress: () => {},
        },
        {
          icon: "help-circle-outline" as const,
          label: "Help & Support",
          onPress: () => {},
        },
        {
          icon: "information-circle-outline" as const,
          label: "App Version",
          value: "1.0.0",
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <ScreenWrapper>
      <Header title="Profile" />

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Profile Card */}
        <GlassCard className="mb-5">
          <View className="flex-row items-center">
            <View className="w-16 h-16 rounded-full bg-primary items-center justify-center mr-4">
              <Text className="text-white text-2xl font-bold">
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-white text-lg font-bold">
                {user?.name ?? "User"}
              </Text>
              <Text className="text-white/50 text-sm mt-0.5">
                {user?.phone ? maskString(user.phone) : ""}
              </Text>
              <View className="flex-row items-center mt-1">
                <View className="w-2 h-2 rounded-full bg-success mr-1.5" />
                <Text className="text-success text-xs font-medium">
                  Verified
                </Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Menu Sections */}
        {menuSections.map((section) => (
          <View key={section.title} className="mb-5">
            <Text className="text-white/50 text-xs font-medium uppercase tracking-wider mb-2 ml-1">
              {section.title}
            </Text>
            <GlassCard noPadding>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={item.onPress}
                  className={`flex-row items-center px-4 py-3.5 ${
                    index < section.items.length - 1
                      ? "border-b border-white/5"
                      : ""
                  }`}
                >
                  <Ionicons name={item.icon} size={20} color="#6C63FF" />
                  <Text className="text-white text-base ml-3 flex-1">
                    {item.label}
                  </Text>
                  {item.value && (
                    <Text className="text-white/40 text-sm mr-2">
                      {item.value}
                    </Text>
                  )}
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="rgba(255,255,255,0.2)"
                  />
                </TouchableOpacity>
              ))}
            </GlassCard>
          </View>
        ))}

        {/* Sign Out */}
        <TouchableOpacity
          onPress={handleLogout}
          className="mb-10"
        >
          <GlassCard>
            <View className="flex-row items-center justify-center">
              <Ionicons name="log-out-outline" size={20} color="#FF3D71" />
              <Text className="text-danger font-semibold ml-2">Sign Out</Text>
            </View>
          </GlassCard>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}
