import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RowDivider, SectionCard } from "@/components/profile";
import { useFirebaseSessionReady } from "@/hooks/useFirebaseSessionReady";
import { useTheme } from "@/hooks/useTheme";

export default function LinkedBankAccountsScreen() {
  const theme = useTheme();
  const { hasUser: firebaseHasUser } = useFirebaseSessionReady();
  const bankAccounts = useQuery(
    api.payments.listBankAccounts,
    firebaseHasUser ? {} : "skip"
  );
  const accounts = bankAccounts ?? [];

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg }}>
      <SafeAreaView className="flex-1" edges={["bottom"]}>
        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          {accounts.length === 0 ? (
            <SectionCard>
              <View className="px-4 py-4">
                <Text className="text-sm" style={{ color: theme.subtext }}>
                  No bank accounts added yet.
                </Text>
              </View>
            </SectionCard>
          ) : (
            <SectionCard>
              {accounts.map((account, index) => {
                const typeLabel = account.type === "card" ? "Card" : "Bank";
                const primaryLine =
                  account.type === "card"
                    ? `${account.brand ?? "Card"} •••• ${account.accountLast4}`
                    : `${account.bankName} •••• ${account.accountLast4}`;
                const secondaryLine = account.cardholderName || typeLabel;

                return (
                  <React.Fragment key={account._id}>
                    <View className="min-h-[54px] px-4 py-3">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-semibold flex-1" style={{ color: theme.text }}>
                          {primaryLine}
                        </Text>
                        {account.isDefault ? (
                          <View
                            className="px-2 py-1 rounded-full ml-3"
                            style={{ backgroundColor: `${theme.accent}1A` }}
                          >
                            <Text className="text-[11px] font-medium" style={{ color: theme.accent }}>
                              Default
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-xs mt-1" style={{ color: theme.subtext }}>
                        {secondaryLine}
                      </Text>
                    </View>
                    {index < accounts.length - 1 ? <RowDivider /> : null}
                  </React.Fragment>
                );
              })}
            </SectionCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

