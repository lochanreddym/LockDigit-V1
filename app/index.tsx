import React, { useEffect } from "react";
import { View, Text, Image } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "@/hooks/useAuth";
import * as SecureStoreHelper from "@/lib/secure-store";

/**
 * Entry point / Splash screen.
 * Checks authentication state and redirects accordingly:
 * - No account -> Login screen
 * - Has account + PIN -> PIN lock screen
 * - Authenticated + PIN verified -> Home
 */
export default function Index() {
  const router = useRouter();
  const { setAuthenticated, setPinCreated, setLoading } = useAuthStore();

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const hasSetup = await SecureStoreHelper.hasCompletedSetup();
      const userId = await SecureStoreHelper.getUserId();
      const pinData = await SecureStoreHelper.getPinHash();

      if (hasSetup && userId && pinData.hash) {
        // Existing user - go to PIN lock
        setAuthenticated(userId, "");
        setPinCreated();
        setLoading(false);
        router.replace("/pin-lock");
      } else {
        // New user - go to auth flow
        setLoading(false);
        router.replace("/(auth)/login");
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setLoading(false);
      router.replace("/(auth)/login");
    }
  };

  return (
    <LinearGradient
      colors={["#0A0E1A", "#151929", "#0A0E1A"]}
      className="flex-1 items-center justify-center"
    >
      <View className="items-center">
        <View className="w-24 h-24 rounded-3xl bg-primary items-center justify-center mb-6">
          <Text className="text-white text-4xl font-bold">L</Text>
        </View>
        <Text className="text-white text-3xl font-bold">LockDigit</Text>
        <Text className="text-white/50 text-base mt-2">
          Your Digital Identity Wallet
        </Text>
      </View>
    </LinearGradient>
  );
}
