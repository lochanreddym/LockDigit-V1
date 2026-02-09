import React from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/common";
import { GlassButton } from "@/components/glass";
import { Ionicons } from "@expo/vector-icons";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <ScreenWrapper>
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="alert-circle-outline" size={64} color="rgba(255,255,255,0.3)" />
        <Text className="text-white text-2xl font-bold mt-4">
          Page Not Found
        </Text>
        <Text className="text-white/50 text-center mt-2 mb-8">
          The page you're looking for doesn't exist.
        </Text>
        <GlassButton
          title="Go Home"
          onPress={() => router.replace("/")}
          size="lg"
        />
      </View>
    </ScreenWrapper>
  );
}
