import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/convex/_generated/api";
import {
  DestructiveButton,
  NavRow,
  ProfileHeaderCard,
  RowDivider,
  SectionCard,
} from "@/components/profile";
import { profile as profileMock, security as securityMock } from "@/constants/profileMock";
import { useAuthStore } from "@/hooks/useAuth";
import { useFirebaseSessionReady } from "@/hooks/useFirebaseSessionReady";
import { useTheme } from "@/hooks/useTheme";
import { signOutFirebase } from "@/lib/firebase";
import * as SecureStoreHelper from "@/lib/secure-store";
import { DarkModePreference } from "@/lib/secure-store";
import { maskString } from "@/lib/utils";

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { hasUser: firebaseHasUser } = useFirebaseSessionReady();
  const { logout: authLogout } = useAuthStore();
  const user = useQuery(api.users.getMe, firebaseHasUser ? {} : "skip");
  const documents = useQuery(api.documents.listMine, firebaseHasUser ? {} : "skip");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(
    securityMock.twoFactorEnabled
  );
  const [darkModePref, setDarkModePref] = useState<DarkModePreference>("system");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [storedTwoFactorEnabled, storedDarkModePref] = await Promise.all([
        SecureStoreHelper.getTwoFactorEnabled(),
        SecureStoreHelper.getDarkModePreference(),
      ]);
      if (!mounted) return;
      setTwoFactorEnabled(storedTwoFactorEnabled);
      setDarkModePref(storedDarkModePref);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const appearanceLabel = useMemo(() => {
    if (darkModePref === "dark") return "Dark";
    if (darkModePref === "light") return "Light";
    return "System";
  }, [darkModePref]);

  const shouldShowRecoveryOptions = useMemo(
    () =>
      twoFactorEnabled ||
      Boolean(securityMock.recoveryEmail) ||
      Boolean(securityMock.recoveryPhone),
    [twoFactorEnabled]
  );

  const displayName = user?.name?.trim() || profileMock.name;
  const verified = user?.phoneVerified ?? profileMock.verified;
  const phoneMasked = user?.phone ? maskString(user.phone) : "Not set";
  const linkedSummary = `${documents?.length ?? 0} docs`;
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? You'll need to verify your phone number to sign back in.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOutFirebase();
              await SecureStoreHelper.clearSession();
              authLogout();
              router.replace("/(auth)/login");
            } catch (error) {
              if (__DEV__) {
                console.error("Logout error:", error);
              }
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg }}>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View
          className="px-4 pt-2 pb-3 border-b"
          style={{ borderColor: theme.border, backgroundColor: theme.card }}
        >
          <Text className="text-2xl font-bold" style={{ color: theme.text }}>
            Profile
          </Text>
        </View>

        <ScrollView
          className="flex-1 px-4 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          <ProfileHeaderCard
            name={displayName}
            maskedId={profileMock.maskedId}
            verified={verified}
            trustScore={profileMock.trustScore}
            memberSince={profileMock.memberSince}
          />

          <Text className="text-xs font-semibold uppercase mt-5 mb-2 ml-1" style={{ color: theme.subtext }}>
            Account
          </Text>
          <SectionCard>
            <NavRow
              icon="person-outline"
              label="Personal Information"
              accessibilityLabel="Open personal information"
              onPress={() => router.push("/(app)/profile/personal-info")}
            />
            <RowDivider />
            <NavRow
              icon="call-outline"
              label="Contact Information"
              value={phoneMasked}
              accessibilityLabel="Open contact information"
              onPress={() => router.push("/(app)/profile/contact-info")}
            />
            <RowDivider />
            <NavRow
              icon="link-outline"
              label="Linked Accounts"
              value={linkedSummary}
              accessibilityLabel="Open linked accounts"
              onPress={() => router.push("/(app)/profile/linked-accounts")}
            />
          </SectionCard>

          <Text className="text-xs font-semibold uppercase mt-5 mb-2 ml-1" style={{ color: theme.subtext }}>
            Security
          </Text>
          <SectionCard>
            <NavRow
              icon="shield-checkmark-outline"
              label="Authentication"
              value={twoFactorEnabled ? "2FA On" : "2FA Off"}
              accessibilityLabel="Open authentication settings"
              onPress={() => router.push("/(app)/profile/authentication")}
            />
            <RowDivider />
            <NavRow
              icon="phone-portrait-outline"
              label="Devices & Sessions"
              value="Active"
              accessibilityLabel="Open devices and sessions"
              onPress={() => router.push("/(app)/profile/devices-sessions")}
            />
            {shouldShowRecoveryOptions ? (
              <>
                <RowDivider />
                <NavRow
                  icon="key-outline"
                  label="Recovery Options"
                  accessibilityLabel="Open recovery options"
                  onPress={() => router.push("/(app)/profile/recovery-options")}
                />
              </>
            ) : null}
          </SectionCard>

          <Text className="text-xs font-semibold uppercase mt-5 mb-2 ml-1" style={{ color: theme.subtext }}>
            Preferences
          </Text>
          <SectionCard>
            <NavRow
              icon="color-palette-outline"
              label="Appearance"
              value={appearanceLabel}
              accessibilityLabel="Open appearance settings"
              onPress={() => router.push("/(app)/profile/appearance")}
            />
            <RowDivider />
            <NavRow
              icon="notifications-outline"
              label="Notifications"
              accessibilityLabel="Open notification settings"
              onPress={() => router.push("/(app)/profile/notifications")}
            />
          </SectionCard>

          <View className="mt-6 items-center">
            <DestructiveButton
              label="Log Out"
              onPress={handleLogout}
              accessibilityLabel="Log out of account"
            />
            <Text className="text-xs mt-2" style={{ color: theme.subtext }}>
              Version {appVersion}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
