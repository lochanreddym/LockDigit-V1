import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NavRow, RowDivider, SectionCard } from "@/components/profile";
import { security as securityMock } from "@/constants/profileMock";
import { useTheme } from "@/hooks/useTheme";
import * as SecureStoreHelper from "@/lib/secure-store";
import { maskString } from "@/lib/utils";

export default function RecoveryOptionsScreen() {
  const theme = useTheme();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(securityMock.twoFactorEnabled);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const storedTwoFactorEnabled = await SecureStoreHelper.getTwoFactorEnabled();
      if (mounted) {
        setTwoFactorEnabled(storedTwoFactorEnabled);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const hasRecoveryEmail = Boolean(securityMock.recoveryEmail);
  const hasRecoveryPhone = Boolean(securityMock.recoveryPhone);

  const totalItems = useMemo(() => {
    let count = 0;
    if (hasRecoveryEmail) count += 1;
    if (hasRecoveryPhone) count += 1;
    if (twoFactorEnabled) count += 1;
    return count;
  }, [hasRecoveryEmail, hasRecoveryPhone, twoFactorEnabled]);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg }}>
      <SafeAreaView className="flex-1" edges={["bottom"]}>
        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          {totalItems === 0 ? (
            <SectionCard>
              <View className="px-4 py-4">
                <Text className="text-sm" style={{ color: theme.subtext }}>
                  No recovery methods are configured.
                </Text>
              </View>
            </SectionCard>
          ) : (
            <SectionCard>
              {hasRecoveryEmail ? (
                <NavRow
                  icon="mail-outline"
                  label="Recovery Email"
                  value={securityMock.recoveryEmail ?? ""}
                  showChevron={false}
                  accessibilityLabel="Recovery email"
                />
              ) : null}

              {hasRecoveryEmail && (hasRecoveryPhone || twoFactorEnabled) ? <RowDivider /> : null}

              {hasRecoveryPhone ? (
                <NavRow
                  icon="call-outline"
                  label="Recovery Phone"
                  value={maskString(securityMock.recoveryPhone ?? "")}
                  showChevron={false}
                  accessibilityLabel="Recovery phone"
                />
              ) : null}

              {hasRecoveryPhone && twoFactorEnabled ? <RowDivider /> : null}

              {twoFactorEnabled ? (
                <NavRow
                  icon="key-outline"
                  label="Backup Codes"
                  accessibilityLabel="Manage backup codes"
                  onPress={() => Alert.alert("Coming Soon", "Backup code export is coming soon.")}
                />
              ) : null}
            </SectionCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

