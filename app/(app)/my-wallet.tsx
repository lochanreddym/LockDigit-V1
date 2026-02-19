import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import { getBankLogo } from "@/lib/card-utils";

type AccountWithType = {
  _id: Id<"bankAccounts">;
  bankName: string;
  accountLast4: string;
  cardholderName?: string;
  type?: "bank" | "card";
  expiryMonth?: string;
  expiryYear?: string;
  brand?: string;
  paymentPinHash?: string;
};

export default function MyWalletScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;

  const [refreshing, setRefreshing] = useState(false);
  const [viewBalanceModal, setViewBalanceModal] = useState(false);
  const [balancePin, setBalancePin] = useState("");
  const [balanceUnlocked, setBalanceUnlocked] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const bankAccounts = useQuery(
    api.payments.listBankAccounts,
    convexUserId ? { userId: convexUserId } : "skip"
  ) as AccountWithType[] | undefined;

  const verifyPaymentPin = useMutation(api.payments.verifyPaymentPin);
  const removeBankAccount = useMutation(api.payments.removeBankAccount);

  const defaultAccount = bankAccounts?.find((a) => a.paymentPinHash)?._id;
  const cards = bankAccounts?.filter((a) => a.type === "card") ?? [];
  const banks = bankAccounts?.filter((a) => !a.type || a.type === "bank") ?? [];

  const totalBalance = 12450.0;
  const creditSpending = 1240.5;
  const creditLimit = 5000;
  const creditPercent = Math.round((creditSpending / creditLimit) * 100);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleViewBalance = () => {
    if (!defaultAccount) {
      Alert.alert("No account", "Add a bank account or card with a PIN to view balance.");
      return;
    }
    setBalancePin("");
    setBalanceUnlocked(false);
    setViewBalanceModal(true);
  };

  const handleVerifyBalancePin = async () => {
    if (!defaultAccount || balancePin.length < 4) return;
    setVerifying(true);
    try {
      const ok = await verifyPaymentPin({ accountId: defaultAccount, pin: balancePin });
      if (ok) {
        setBalanceUnlocked(true);
        setTimeout(() => setViewBalanceModal(false), 600);
      } else {
        Alert.alert("Wrong PIN", "Try again.");
        setBalancePin("");
      }
    } catch {
      Alert.alert("Error", "Could not verify PIN.");
    } finally {
      setVerifying(false);
    }
  };

  const handleUnlink = (account: AccountWithType) => {
    Alert.alert(
      "Unlink Account",
      `Remove ${account.bankName} ....${account.accountLast4} from your wallet?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlink",
          style: "destructive",
          onPress: async () => {
            try {
              await removeBankAccount({ accountId: account._id });
            } catch {
              Alert.alert("Error", "Could not unlink account.");
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center mr-3">
                <Ionicons name="wallet" size={22} color="#0A84FF" />
              </View>
              <View>
                <Text className="text-ios-dark text-xl font-bold">My Wallet</Text>
                <Text className="text-ios-grey4 text-sm">Financial snapshot</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-ios-bg items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          {/* Summary cards: Total Balance + Active Loans */}
          <View className="flex-row gap-3 px-5 mb-4">
            <View className="flex-1 bg-ios-bg rounded-2xl p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-ios-grey4 text-xs font-medium uppercase tracking-wide">
                  Total Balance
                </Text>
                <TouchableOpacity onPress={onRefresh} className="p-1">
                  <Ionicons name="refresh" size={18} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              <Text className="text-ios-dark text-xl font-bold mt-1">
                {balanceUnlocked
                  ? `$${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                  : "••••••"}
              </Text>
              <TouchableOpacity
                onPress={handleViewBalance}
                className="mt-2"
              >
                <Text className="text-primary text-sm font-medium">
                  {balanceUnlocked ? "Balance visible" : "View balance"}
                </Text>
              </TouchableOpacity>
            </View>
            <View className="flex-1 bg-ios-bg rounded-2xl p-4">
              <Text className="text-ios-grey4 text-xs font-medium uppercase tracking-wide">
                Active Loans
              </Text>
              <Text className="text-green-600 text-base font-semibold mt-1">
                No Active Loans
              </Text>
            </View>
          </View>

          {/* Credit Card Spending (black card) */}
          <View className="mx-5 mb-5 rounded-2xl overflow-hidden bg-black p-5" style={styles.cardShadow}>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-white/90 text-xs font-semibold uppercase tracking-wide">
                Credit Card Spending
              </Text>
              <Ionicons name="card-outline" size={18} color="rgba(255,255,255,0.8)" />
            </View>
            <Text className="text-white text-2xl font-bold">
              ${creditSpending.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </Text>
            <Text className="text-white/80 text-sm mt-0.5">
              of ${creditLimit.toLocaleString("en-US", { minimumFractionDigits: 2 })} limit
            </Text>
            <View className="absolute bottom-5 right-5 w-12 h-12 rounded-full border-2 border-white/50 items-center justify-center">
              <Text className="text-white text-xs font-bold">{creditPercent}%</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="px-5 mb-2">
            <Text className="text-ios-grey4 text-xs font-semibold uppercase tracking-wide mb-3">
              Quick Actions
            </Text>
          </View>
          <View className="px-5 gap-3 mb-5">
            <TouchableOpacity
              className="flex-row items-center bg-white rounded-2xl border border-ios-border p-4"
              style={styles.cardShadow}
              activeOpacity={0.8}
              onPress={() => router.push("/(app)/add-new-card")}
            >
              <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center mr-4">
                <Ionicons name="card" size={24} color="#0A84FF" />
              </View>
              <View className="flex-1">
                <Text className="text-ios-dark font-semibold">Add New Card</Text>
                <Text className="text-ios-grey4 text-sm mt-0.5">Credit or Debit card</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center bg-white rounded-2xl border border-ios-border p-4"
              style={styles.cardShadow}
              activeOpacity={0.8}
              onPress={() => router.push("/(app)/add-bank-account")}
            >
              <View className="w-12 h-12 rounded-xl bg-green-500/10 items-center justify-center mr-4">
                <Ionicons name="business" size={24} color="#30D158" />
              </View>
              <View className="flex-1">
                <Text className="text-ios-dark font-semibold">Add Bank Account</Text>
                <Text className="text-ios-grey4 text-sm mt-0.5">Link for direct debit</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          </View>

          {/* Saved Accounts */}
          <View className="px-5 mb-2">
            <Text className="text-ios-grey4 text-xs font-semibold uppercase tracking-wide mb-3">
              Saved Accounts
            </Text>
          </View>
          <View className="px-5 gap-3">
            {cards.length > 0 &&
              cards.map((account) => (
                <View
                  key={account._id}
                  className="bg-white rounded-2xl border border-ios-border overflow-hidden"
                  style={styles.cardShadow}
                >
                  <View className="flex-row items-center p-4">
                    <Image
                      source={getBankLogo(account.bankName)}
                      className="w-12 h-12 rounded-xl mr-4"
                      resizeMode="contain"
                    />
                    <View className="flex-1">
                      <Text className="text-ios-dark font-semibold">
                        {account.bankName}
                      </Text>
                      <Text className="text-ios-grey4 text-sm mt-0.5">
                        {account.brand ? `${account.brand} ` : ""}....{account.accountLast4}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleUnlink(account)}
                      className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200"
                      activeOpacity={0.7}
                    >
                      <Text className="text-red-500 text-xs font-semibold">Unlink</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            {banks.length > 0 &&
              banks.map((account) => (
                <View
                  key={account._id}
                  className="bg-white rounded-2xl border border-ios-border overflow-hidden"
                  style={styles.cardShadow}
                >
                  <View className="flex-row items-center p-4">
                    <View className="w-12 h-12 rounded-xl bg-green-500/10 items-center justify-center mr-4">
                      <Ionicons name="business" size={22} color="#30D158" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-ios-dark font-semibold">{account.bankName}</Text>
                      <Text className="text-ios-grey4 text-sm mt-0.5">
                        ....{account.accountLast4}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleUnlink(account)}
                      className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200"
                      activeOpacity={0.7}
                    >
                      <Text className="text-red-500 text-xs font-semibold">Unlink</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            {(!bankAccounts || bankAccounts.length === 0) && (
              <View className="bg-white rounded-2xl border border-ios-border p-6 items-center">
                <Ionicons name="wallet-outline" size={40} color="#C7C7CC" />
                <Text className="text-ios-grey4 text-sm mt-2">No saved accounts yet</Text>
                <Text className="text-ios-grey4 text-xs mt-1">
                  Add a card or bank account above
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* View balance: Enter PIN modal */}
      <Modal
        visible={viewBalanceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setViewBalanceModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setViewBalanceModal(false)}
          className="flex-1 bg-black/50 justify-center px-6"
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View className="bg-white rounded-3xl p-6">
              <Text className="text-ios-dark text-lg font-bold text-center mb-1">
                View balance
              </Text>
              <Text className="text-ios-grey4 text-sm text-center mb-4">
                Enter your payment PIN
              </Text>
              <TextInput
                value={balancePin}
                onChangeText={(t) => setBalancePin(t.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••"
                keyboardType="number-pad"
                maxLength={6}
                secureTextEntry
                className="bg-ios-bg border border-ios-border rounded-xl px-4 py-3 text-ios-dark text-center text-lg mb-4"
                placeholderTextColor="#8E8E93"
              />
              {balanceUnlocked ? (
                <Text className="text-green-600 text-center font-semibold">Balance visible</Text>
              ) : (
                <TouchableOpacity
                  onPress={handleVerifyBalancePin}
                  disabled={verifying || balancePin.length < 4}
                  className="bg-primary rounded-xl py-3.5 items-center"
                  style={(verifying || balancePin.length < 4) && { opacity: 0.5 }}
                >
                  <Text className="text-white font-semibold">
                    {verifying ? "Verifying..." : "Submit"}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setViewBalanceModal(false)}
                className="mt-3 py-2"
              >
                <Text className="text-ios-grey4 text-center">Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
});
