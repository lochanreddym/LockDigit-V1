import React from "react";
import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F2F2F7" },
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
      <Stack.Screen name="categories" />
      <Stack.Screen name="categories/[category]" />
      <Stack.Screen name="payment-success" />
      <Stack.Screen name="add-credential" />
      <Stack.Screen name="my-wallet" />
      <Stack.Screen name="add-bank-account" />
      <Stack.Screen name="add-new-card" />
      <Stack.Screen name="money-transfer" />
      <Stack.Screen name="receive-money" />
      <Stack.Screen name="send-to-mobile" />
      <Stack.Screen name="send-to-mobile-amount" />
    </Stack>
  );
}
