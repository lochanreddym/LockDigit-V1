import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { Pressable } from "react-native";
import { useTheme } from "@/hooks/useTheme";

export default function ProfileStackLayout() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerTintColor: theme.accent,
        headerStyle: { backgroundColor: theme.bg },
        headerTitleStyle: {
          color: theme.text,
          fontWeight: "700",
        },
        headerLeft: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back to Profile"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
                return;
              }
              router.replace("/(app)/(tabs)/profile");
            }}
            className="h-10 w-10 items-start justify-center"
          >
            <Ionicons name="chevron-back" size={24} color={theme.accent} />
          </Pressable>
        ),
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen name="personal-info" options={{ title: "Personal Information" }} />
      <Stack.Screen name="contact-info" options={{ title: "Contact Information" }} />
      <Stack.Screen name="linked-accounts" options={{ title: "Linked Accounts" }} />
      <Stack.Screen
        name="linked-government-ids"
        options={{ title: "Government IDs" }}
      />
      <Stack.Screen
        name="linked-bank-accounts"
        options={{ title: "Bank Accounts" }}
      />
      <Stack.Screen
        name="linked-documents"
        options={{ title: "Documents" }}
      />
      <Stack.Screen name="authentication" options={{ title: "Authentication" }} />
      <Stack.Screen name="devices-sessions" options={{ title: "Devices & Sessions" }} />
      <Stack.Screen name="recovery-options" options={{ title: "Recovery Options" }} />
      <Stack.Screen name="appearance" options={{ title: "Appearance" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
    </Stack>
  );
}
