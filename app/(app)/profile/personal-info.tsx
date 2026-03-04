import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NavRow, RowDivider, SectionCard } from "@/components/profile";
import { profile as profileMock } from "@/constants/profileMock";
import { useFirebaseSessionReady } from "@/hooks/useFirebaseSessionReady";
import { useTheme } from "@/hooks/useTheme";

export default function PersonalInfoScreen() {
  const theme = useTheme();
  const { hasUser: firebaseHasUser } = useFirebaseSessionReady();
  const user = useQuery(api.users.getMe, firebaseHasUser ? {} : "skip");

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg }}>
      <SafeAreaView className="flex-1" edges={["bottom"]}>
        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          <SectionCard>
            <NavRow
              icon="person-outline"
              label="Full Name"
              value={user?.name || profileMock.name}
              showChevron={false}
              accessibilityLabel="Full name"
            />
            <RowDivider />
            <NavRow
              icon="calendar-outline"
              label="Date of Birth"
              value="Not set"
              showChevron={false}
              accessibilityLabel="Date of birth"
            />
            <RowDivider />
            <NavRow
              icon="home-outline"
              label="Address"
              value="Not set"
              showChevron={false}
              accessibilityLabel="Address"
            />
          </SectionCard>
          <Text className="text-xs mt-3 px-1" style={{ color: theme.subtext }}>
            Personal information editing will be available in a future update.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

