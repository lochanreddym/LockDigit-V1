import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RowDivider, SectionCard, ToggleRow } from "@/components/profile";
import { useTheme } from "@/hooks/useTheme";
import * as SecureStoreHelper from "@/lib/secure-store";

export default function ProfileNotificationsScreen() {
  const theme = useTheme();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [securityAlertsEnabled, setSecurityAlertsEnabled] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [storedPushEnabled, storedSecurityAlertsEnabled] = await Promise.all([
        SecureStoreHelper.getPushNotificationsEnabled(),
        SecureStoreHelper.getSecurityAlertsEnabled(),
      ]);
      if (!mounted) return;
      setPushEnabled(storedPushEnabled);
      setSecurityAlertsEnabled(storedSecurityAlertsEnabled);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handlePushToggle = async (next: boolean) => {
    setPushEnabled(next);
    await SecureStoreHelper.setPushNotificationsEnabled(next);
  };

  const handleSecurityAlertToggle = async (next: boolean) => {
    setSecurityAlertsEnabled(next);
    await SecureStoreHelper.setSecurityAlertsEnabled(next);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg }}>
      <SafeAreaView className="flex-1" edges={["bottom"]}>
        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          <SectionCard>
            <ToggleRow
              icon="notifications-outline"
              label="Push Notifications"
              value={pushEnabled}
              onValueChange={handlePushToggle}
              accessibilityLabel="Toggle push notifications"
            />
            <RowDivider />
            <ToggleRow
              icon="shield-checkmark-outline"
              label="Security Alerts"
              value={securityAlertsEnabled}
              onValueChange={handleSecurityAlertToggle}
              accessibilityLabel="Toggle security alerts"
            />
          </SectionCard>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

