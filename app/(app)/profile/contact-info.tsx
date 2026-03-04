import React from "react";
import { Alert, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NavRow, RowDivider, SectionCard } from "@/components/profile";
import { useFirebaseSessionReady } from "@/hooks/useFirebaseSessionReady";
import { useTheme } from "@/hooks/useTheme";
import { maskString } from "@/lib/utils";

export default function ContactInfoScreen() {
  const theme = useTheme();
  const { hasUser: firebaseHasUser } = useFirebaseSessionReady();
  const user = useQuery(api.users.getMe, firebaseHasUser ? {} : "skip");

  const phoneValue = user?.phone ? maskString(user.phone) : "Not set";
  const emailValue = user?.email?.trim() || "Not set";
  const emailVerified = false;
  const showVerifyEmail = Boolean(user?.email) && !emailVerified;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg }}>
      <SafeAreaView className="flex-1" edges={["bottom"]}>
        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          <SectionCard>
            <NavRow
              icon="call-outline"
              label="Phone Number"
              value={phoneValue}
              showChevron={false}
              accessibilityLabel="Phone number"
            />
            <RowDivider />
            <NavRow
              icon="mail-outline"
              label="Email"
              value={emailValue}
              showChevron={false}
              accessibilityLabel="Email address"
            />
            {showVerifyEmail ? (
              <>
                <RowDivider />
                <NavRow
                  icon="checkmark-done-outline"
                  label="Verify Email"
                  accessibilityLabel="Verify email"
                  onPress={() => Alert.alert("Coming Soon", "Email verification will be available soon.")}
                />
              </>
            ) : null}
          </SectionCard>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

