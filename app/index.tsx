import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "@/hooks/useAuth";
import * as SecureStoreHelper from "@/lib/secure-store";

/**
 * Entry point / Splash screen.
 * Checks authentication state and redirects accordingly.
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
        setAuthenticated(userId, "");
        setPinCreated();
        setLoading(false);
        router.replace("/pin-lock");
      } else {
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
    <View className="flex-1">
      {/* Hero Gradient */}
      <LinearGradient
        colors={["#0A84FF", "#5E5CE6", "#7C3AED"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-1 items-center justify-center"
      >
        {/* Decorative shapes */}
        <View className="absolute top-10 left-10 w-32 h-32 rounded-3xl bg-white/10 rotate-12" />
        <View className="absolute top-32 right-16 w-24 h-24 rounded-2xl bg-white/5 -rotate-12" />
        <View className="absolute bottom-20 left-1/4 w-40 h-40 rounded-3xl bg-white/10 rotate-45" />

        {/* Logo */}
        <View className="items-center">
          <Image
            source={require("@/assets/images/app-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text className="text-white text-3xl font-bold mt-4">LockDigit</Text>
          <Text className="text-white/80 text-base mt-2">
            Secure way to Store and Verify ID.
          </Text>
          <ActivityIndicator color="#FFFFFF" size="small" className="mt-6" />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 120,
    height: 120,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
});
