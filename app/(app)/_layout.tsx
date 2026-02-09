import React from "react";
import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0A0E1A" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="scan-to-pay"
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="document/[id]" />
      <Stack.Screen name="bill/[id]" />
      <Stack.Screen name="search" />
    </Stack>
  );
}
