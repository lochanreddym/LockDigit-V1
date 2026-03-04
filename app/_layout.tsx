import "../global.css";
import "@/lib/nativewind-interop"; // Register third-party components with NativeWind (must be early)
import React, { useEffect } from "react";
import { useColorScheme, Appearance } from "react-native";
import { Stack } from "expo-router";
import * as SecureStoreHelper from "@/lib/secure-store";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { StripeProvider } from "@/lib/stripe-native";
import { getFirebaseToken, subscribeAuthState } from "@/lib/firebase";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useAppStateLock } from "@/hooks/useAppState";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL as string
);

function AppContent() {
  const colorScheme = useColorScheme();

  // Monitor app state for auto-lock
  useAppStateLock();

  useEffect(() => {
    (async () => {
      const pref = await SecureStoreHelper.getDarkModePreference();
      if (pref !== "system") {
        Appearance.setColorScheme(pref as "light" | "dark" | null);
      }
    })();
  }, []);

  useEffect(() => {
    // Hide splash screen after a brief delay
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colorScheme === "dark" ? "#000000" : "#F2F2F7",
          },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen
          name="pin-lock"
          options={{
            animation: "fade",
            gestureEnabled: false,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    const applyAuth = () =>
      convex.setAuth(async () => {
        try {
          return await getFirebaseToken();
        } catch (error) {
          if (__DEV__) {
            console.warn("Convex auth token fetch failed:", error);
          }
          return null;
        }
      });

    // Initialize Convex auth and refresh it whenever Firebase auth state changes.
    applyAuth();
    const unsubscribe = subscribeAuthState(() => {
      applyAuth();
    });

    return () => {
      unsubscribe();
      convex.clearAuth();
    };
  }, []);

  return (
    <ConvexProvider client={convex}>
      <StripeProvider
        publishableKey={
          process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
        }
      >
        <AppContent />
      </StripeProvider>
    </ConvexProvider>
  );
}
