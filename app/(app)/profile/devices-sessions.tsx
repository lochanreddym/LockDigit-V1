import React from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DestructiveButton, NavRow, RowDivider, SectionCard } from "@/components/profile";
import { sessions } from "@/constants/profileMock";
import { useTheme } from "@/hooks/useTheme";

export default function DevicesSessionsScreen() {
  const theme = useTheme();

  const handleSignOutAllDevices = () => {
    Alert.alert(
      "Sign Out of All Devices",
      "This will sign out all active sessions except this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => Alert.alert("Done", "All other sessions have been signed out."),
        },
      ]
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg }}>
      <SafeAreaView className="flex-1" edges={["bottom"]}>
        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          <SectionCard>
            <NavRow
              icon="phone-portrait-outline"
              label="Device Binding"
              value="Active"
              showChevron={false}
              accessibilityLabel="Device binding status"
            />
            <RowDivider />
            <NavRow
              icon="hardware-chip-outline"
              label="Manage Devices"
              accessibilityLabel="Manage bound devices"
              onPress={() => Alert.alert("Coming Soon", "Device management tools are coming soon.")}
            />
          </SectionCard>

          <Text className="text-xs font-semibold uppercase mt-5 mb-2 ml-1" style={{ color: theme.subtext }}>
            Active Sessions
          </Text>
          <SectionCard>
            {sessions.map((session, index) => (
              <React.Fragment key={`${session.device}-${session.lastActive}-${index}`}>
                <View className="min-h-[54px] px-4 py-3 flex-row items-start">
                  <View
                    className="w-9 h-9 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: `${theme.accent}14` }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: theme.accent }}>
                      {session.os.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                      {session.device}
                    </Text>
                    <Text className="text-xs mt-0.5" style={{ color: theme.subtext }}>
                      {session.os} • {session.location}
                    </Text>
                  </View>
                  <Text className="text-xs mt-0.5" style={{ color: theme.subtext }}>
                    {session.lastActive}
                  </Text>
                </View>
                {index < sessions.length - 1 ? <RowDivider /> : null}
              </React.Fragment>
            ))}
          </SectionCard>

          <View className="mt-6">
            <DestructiveButton
              label="Sign out of all devices"
              onPress={handleSignOutAllDevices}
              accessibilityLabel="Sign out of all devices"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

