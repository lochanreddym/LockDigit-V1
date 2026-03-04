import React, { useEffect, useState } from "react";
import { Alert, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as LocalAuthentication from "expo-local-authentication";
import { NavRow, RowDivider, SectionCard, ToggleRow } from "@/components/profile";
import { security as securityMock } from "@/constants/profileMock";
import { useTheme } from "@/hooks/useTheme";
import * as SecureStoreHelper from "@/lib/secure-store";

export default function AuthenticationScreen() {
  const theme = useTheme();
  const [biometricEnabled, setBiometricEnabled] = useState(securityMock.biometricsEnabled);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(securityMock.twoFactorEnabled);
  const biometricLabel = Platform.OS === "ios" ? "Face ID" : "Biometrics";

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [storedBiometricEnabled, storedTwoFactorEnabled] = await Promise.all([
        SecureStoreHelper.isFaceIdEnabled(),
        SecureStoreHelper.getTwoFactorEnabled(),
      ]);
      if (!mounted) return;
      setBiometricEnabled(storedBiometricEnabled);
      setTwoFactorEnabled(storedTwoFactorEnabled);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleBiometricToggle = async (next: boolean) => {
    if (next) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          "Not Available",
          `${biometricLabel} is not set up on this device.`
        );
        return;
      }
    }
    await SecureStoreHelper.setFaceIdEnabled(next);
    setBiometricEnabled(next);
  };

  const handleTwoFactorToggle = async () => {
    const next = !twoFactorEnabled;
    await SecureStoreHelper.setTwoFactorEnabled(next);
    setTwoFactorEnabled(next);
    Alert.alert(
      next ? "Two-Factor Enabled" : "Two-Factor Disabled",
      next
        ? "Your account now requires an additional verification step."
        : "Two-factor verification has been turned off."
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg }}>
      <SafeAreaView className="flex-1" edges={["bottom"]}>
        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          <Text className="text-xs font-semibold uppercase mb-2 ml-1" style={{ color: theme.subtext }}>
            PIN
          </Text>
          <SectionCard>
            <NavRow
              icon="lock-closed-outline"
              label="Change PIN"
              accessibilityLabel="Change PIN"
              onPress={() => Alert.alert("Coming Soon", "PIN change flow will be available soon.")}
            />
          </SectionCard>

          <Text className="text-xs font-semibold uppercase mt-5 mb-2 ml-1" style={{ color: theme.subtext }}>
            Protection
          </Text>
          <SectionCard>
            <ToggleRow
              icon="finger-print-outline"
              label={biometricLabel}
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              accessibilityLabel={`Toggle ${biometricLabel}`}
            />
            <RowDivider />
            <NavRow
              icon="shield-checkmark-outline"
              label="Two-Factor Authentication"
              value={twoFactorEnabled ? "On" : "Off"}
              accessibilityLabel="Toggle two-factor authentication"
              onPress={handleTwoFactorToggle}
            />
          </SectionCard>

          {twoFactorEnabled ? (
            <>
              <Text
                className="text-xs font-semibold uppercase mt-5 mb-2 ml-1"
                style={{ color: theme.subtext }}
              >
                Backup
              </Text>
              <SectionCard>
                <NavRow
                  icon="key-outline"
                  label="Backup Codes"
                  accessibilityLabel="Manage backup codes"
                  onPress={() => Alert.alert("Coming Soon", "Backup code management is coming soon.")}
                />
              </SectionCard>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
