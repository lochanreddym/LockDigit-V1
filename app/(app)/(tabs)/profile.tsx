import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import * as SecureStoreHelper from "@/lib/secure-store";
import { signOutFirebase } from "@/lib/firebase";
import { maskString } from "@/lib/utils";
let LocalAuthentication: any = null;
try {
  LocalAuthentication = require("expo-local-authentication");
} catch {}

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

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);

  useEffect(() => {
    (async () => {
      if (LocalAuthentication) {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricSupported(compatible && enrolled);
      }
      const enabled = await SecureStoreHelper.isFaceIdEnabled();
      setBiometricEnabled(enabled);
    })();
  }, []);

  const toggleBiometric = async () => {
    if (!biometricSupported) {
      Alert.alert(
        "Not Available",
        "Face ID / biometric authentication is not set up on this device. Enable it in your device Settings first."
      );
      return;
    }
    if (!biometricEnabled) {
      if (!LocalAuthentication) {
        Alert.alert("Not Available", "Biometric authentication requires a native rebuild.");
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Verify to enable Face ID for payments",
        fallbackLabel: "Cancel",
        disableDeviceFallback: true,
      });
      if (result.success) {
        await SecureStoreHelper.setFaceIdEnabled(true);
        setBiometricEnabled(true);
        Alert.alert("Enabled", "Face ID is now enabled for credit card payment verification.");
      }
    } else {
      await SecureStoreHelper.setFaceIdEnabled(false);
      setBiometricEnabled(false);
      Alert.alert("Disabled", "Face ID has been disabled. You'll use your PIN for all payment verification.");
    }
  };

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

  const verifiedCount = documents?.filter((d) => d.verified).length ?? 0;

  const menuSections = [
    {
      title: "Account Settings",
      items: [
        {
          icon: "person-outline" as const,
          label: "Personal Information",
          color: "#0A84FF",
          onPress: () =>
            Alert.alert("Coming Soon", "Profile editing will be available in the next update."),
        },
        {
          icon: "call-outline" as const,
          label: "Phone Number",
          color: "#30D158",
          value: user?.phone ? maskString(user.phone) : "Not set",
          onPress: () => {},
        },
        {
          icon: "mail-outline" as const,
          label: "Email Address",
          color: "#5E5CE6",
          value: "Not set",
          onPress: () => {},
        },
      ],
    },
    {
      title: "Security",
      items: [
        {
          icon: "lock-closed-outline" as const,
          label: "Change PIN",
          color: "#FF9500",
          onPress: () =>
            Alert.alert("Coming Soon", "PIN change will be available in the next update."),
        },
        {
          icon: "finger-print-outline" as const,
          label: "Face ID for Payments",
          color: "#0A84FF",
          value: biometricEnabled ? "On" : "Off",
          onPress: toggleBiometric,
        },
        {
          icon: "phone-portrait-outline" as const,
          label: "Device Binding",
          color: "#30D158",
          value: "Active",
          onPress: () =>
            Alert.alert(
              "Device Binding",
              "Your account is bound to this device for security."
            ),
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: "notifications-outline" as const,
          label: "Notifications",
          color: "#FF3B30",
          onPress: () => {},
        },
        {
          icon: "globe-outline" as const,
          label: "Language",
          color: "#5E5CE6",
          value: "English",
          onPress: () => {},
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          icon: "help-circle-outline" as const,
          label: "Help & Support",
          color: "#0A84FF",
          onPress: () => {},
        },
        {
          icon: "shield-outline" as const,
          label: "Privacy Policy",
          color: "#30D158",
          onPress: () => {},
        },
        {
          icon: "document-text-outline" as const,
          label: "Terms of Service",
          color: "#8E8E93",
          onPress: () => {},
        },
        {
          icon: "information-circle-outline" as const,
          label: "App Version",
          color: "#8E8E93",
          value: "1.0.0",
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="bg-white border-b border-ios-border px-5 py-3">
          <Text className="text-2xl font-bold text-ios-dark">Profile</Text>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Profile Card */}
          <View
            className="bg-white rounded-3xl border border-ios-border p-5 mb-5"
            style={styles.cardShadow}
          >
            <View className="flex-row items-center">
              <LinearGradient
                colors={["#0A84FF", "#5E5CE6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="w-16 h-16 rounded-full items-center justify-center mr-4"
              >
                <Text className="text-white text-2xl font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                </Text>
              </LinearGradient>
              <View className="flex-1">
                <Text className="text-ios-dark text-lg font-bold">
                  {user?.name ?? "User"}
                </Text>
                <Text className="text-ios-grey4 text-sm mt-0.5">
                  {user?.phone ? maskString(user.phone) : ""}
                </Text>
                <View className="flex-row items-center mt-1">
                  <View className="bg-success/10 px-2 py-0.5 rounded-full flex-row items-center">
                    <Ionicons name="shield-checkmark" size={12} color="#30D158" />
                    <Text className="text-success text-xs font-medium ml-1">
                      Identity Verified
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Quick Stats */}
            <View className="flex-row mt-5 gap-3">
              <View className="flex-1 bg-ios-bg rounded-2xl py-3 px-4 items-center">
                <Text className="text-primary text-xl font-bold">85</Text>
                <Text className="text-ios-grey4 text-xs">Trust Score</Text>
              </View>
              <View className="flex-1 bg-ios-bg rounded-2xl py-3 px-4 items-center">
                <Text className="text-primary text-xl font-bold">
                  {documents?.length ?? 0}
                </Text>
                <Text className="text-ios-grey4 text-xs">Documents</Text>
              </View>
              <View className="flex-1 bg-ios-bg rounded-2xl py-3 px-4 items-center">
                <Text className="text-primary text-xl font-bold">2026</Text>
                <Text className="text-ios-grey4 text-xs">Member Since</Text>
              </View>
            </View>
          </View>

          {/* Menu Sections */}
          {menuSections.map((section) => (
            <View key={section.title} className="mb-5">
              <Text className="text-ios-grey4 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
                {section.title}
              </Text>
              <View
                className="bg-white rounded-3xl border border-ios-border overflow-hidden"
                style={styles.cardShadow}
              >
                {section.items.map((item, index) => (
                  <TouchableOpacity
                    key={item.label}
                    onPress={item.onPress}
                    className={`flex-row items-center px-4 py-3.5 ${
                      index < section.items.length - 1
                        ? "border-b border-ios-border"
                        : ""
                    }`}
                  >
                    <View
                      className="w-8 h-8 rounded-lg items-center justify-center mr-3"
                      style={{ backgroundColor: `${item.color}12` }}
                    >
                      <Ionicons name={item.icon} size={18} color={item.color} />
                    </View>
                    <Text className="text-ios-dark text-base flex-1">
                      {item.label}
                    </Text>
                    {item.value && (
                      <Text className="text-ios-grey4 text-sm mr-2">
                        {item.value}
                      </Text>
                    )}
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#C7C7CC"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Sign Out */}
          <TouchableOpacity
            onPress={handleLogout}
            className="mb-10"
          >
            <View
              className="bg-white rounded-3xl border border-ios-border overflow-hidden"
              style={styles.cardShadow}
            >
              <View className="flex-row items-center justify-center py-4">
                <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                <Text className="text-danger font-semibold ml-2">Sign Out</Text>
              </View>
            </View>
          </TouchableOpacity>
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
