import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Vibration,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { GlassButton } from "@/components/glass";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";

type Step = "amount" | "source" | "confirm";

export default function SelfTransferScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ destinationAccountId: string }>();
  const { userId } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;

  const destAccountId = params.destinationAccountId as Id<"bankAccounts">;

  const accounts = useQuery(
    api.payments.listBankAccounts,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const verifyPin = useMutation(api.payments.verifyPaymentPin);
  const createLocalTransfer = useMutation(api.payments.createLocalTransfer);

  const [step, setStep] = useState<Step>("amount");
  const [amountCents, setAmountCents] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState<Id<"bankAccounts"> | null>(null);
  const [processing, setProcessing] = useState(false);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinAttempts, setPinAttempts] = useState(0);

  const destAccount = accounts?.find((a) => a._id === destAccountId);
  const sourceAccount = sourceAccountId
    ? accounts?.find((a) => a._id === sourceAccountId)
    : null;

  // Only bank accounts (not cards) can be source, excluding destination
  const availableSources = accounts?.filter(
    (a) => a._id !== destAccountId && a.type !== "card"
  );

  const parsedAmount = parseInt(amountCents || "0", 10);
  const formattedAmount = (parsedAmount / 100).toFixed(2);

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "").replace(/^0+/, "");
    setAmountCents(digits);
  };

  const handleContinue = () => {
    if (parsedAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter an amount to transfer.");
      return;
    }
    setStep("source");
  };

  const handleSourceSelect = (accountId: Id<"bankAccounts">) => {
    setSourceAccountId(accountId);
    setStep("confirm");
  };

  const requestVerification = () => {
    setPin("");
    setPinError("");
    setShowPinModal(true);
  };

  const handlePinSubmit = useCallback(
    async (enteredPin: string) => {
      if (!sourceAccountId) return;
      try {
        const valid = await verifyPin({
          accountId: sourceAccountId,
          pin: enteredPin,
        });
        if (valid) {
          setShowPinModal(false);
          setPin("");
          setPinError("");
          setPinAttempts(0);
          executeTransfer();
        } else {
          const newAttempts = pinAttempts + 1;
          setPinAttempts(newAttempts);
          Vibration.vibrate(300);
          if (newAttempts >= 5) {
            setShowPinModal(false);
            setPin("");
            setPinError("");
            Alert.alert(
              "Too Many Attempts",
              "You've exceeded the maximum number of PIN attempts. Please try again later.",
              [{ text: "OK", onPress: () => router.back() }]
            );
          } else {
            setPinError(
              `Incorrect PIN. ${5 - newAttempts} attempts remaining.`
            );
            setPin("");
          }
        }
      } catch {
        setPinError("Verification failed. Please try again.");
        setPin("");
      }
    },
    [pinAttempts, sourceAccountId]
  );

  const executeTransfer = async () => {
    if (!convexUserId || !sourceAccount || !destAccount) return;
    setProcessing(true);
    try {
      const result = await createLocalTransfer({
        userId: convexUserId,
        amount: parsedAmount,
        type: "transfer",
        description: `Self transfer: ${sourceAccount.bankName} → ${destAccount.bankName}`,
        merchantName: destAccount.bankName,
        paymentMethod: `${sourceAccount.bankName} ••${sourceAccount.accountLast4}`,
      });

      if (result.verified && result.transactionId) {
        router.replace({
          pathname: "/(app)/payment-success",
          params: { transactionId: result.transactionId },
        });
      }
    } catch (error: any) {
      Alert.alert("Transfer Failed", error?.message || "Something went wrong.");
    } finally {
      setProcessing(false);
    }
  };

  if (!accounts) {
    return (
      <View className="flex-1 bg-ios-bg items-center justify-center">
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  // Step 1: Enter amount
  if (step === "amount") {
    return (
      <View className="flex-1 bg-ios-bg">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center px-5 pt-2 pb-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white border border-ios-border items-center justify-center mr-3"
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color="#1C1C1E" />
            </TouchableOpacity>
            <Text className="text-ios-dark text-xl font-bold">
              Self Transfer
            </Text>
          </View>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
          >
            <View className="flex-1 px-5 justify-center">
              {destAccount && (
                <View className="items-center mb-6">
                  <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-3">
                    <Ionicons
                      name={
                        destAccount.type === "card"
                          ? "card-outline"
                          : "business-outline"
                      }
                      size={28}
                      color="#7C3AED"
                    />
                  </View>
                  <Text className="text-ios-dark text-lg font-bold">
                    Transfer to {destAccount.bankName}
                  </Text>
                  <Text className="text-ios-grey4 text-sm">
                    •••• {destAccount.accountLast4}
                  </Text>
                </View>
              )}
              <View
                className="bg-white rounded-3xl border border-ios-border p-5 mb-6"
                style={styles.cardShadow}
              >
                <Text className="text-ios-grey4 text-sm mb-3 text-center">
                  Enter amount to transfer
                </Text>
                <View className="flex-row items-center justify-center">
                  <Text className="text-ios-dark text-4xl font-bold">$</Text>
                  <TextInput
                    value={formattedAmount}
                    onChangeText={handleAmountChange}
                    placeholder="0.00"
                    keyboardType="number-pad"
                    className="text-ios-dark text-4xl font-bold ml-1"
                    placeholderTextColor="#C7C7CC"
                    style={{ minWidth: 120 }}
                    autoFocus
                    selection={{
                      start: formattedAmount.length,
                      end: formattedAmount.length,
                    }}
                  />
                </View>
              </View>
              <GlassButton
                title={`Continue — $${formattedAmount}`}
                onPress={handleContinue}
                size="lg"
                fullWidth
                icon={
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                }
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // Step 2: Select source account
  if (step === "source") {
    return (
      <View className="flex-1 bg-ios-bg">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center px-5 pt-2 pb-3">
            <TouchableOpacity
              onPress={() => setStep("amount")}
              className="w-10 h-10 rounded-full bg-white border border-ios-border items-center justify-center mr-3"
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color="#1C1C1E" />
            </TouchableOpacity>
            <Text className="text-ios-dark text-xl font-bold">
              Select Source Account
            </Text>
          </View>
          <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
            <Text className="text-ios-grey4 text-sm mb-4">
              Choose the account to debit {formatCurrency(parsedAmount)} from
            </Text>
            {availableSources && availableSources.length > 0 ? (
              availableSources.map((account) => (
                <TouchableOpacity
                  key={account._id}
                  activeOpacity={0.7}
                  onPress={() => handleSourceSelect(account._id)}
                  className="mb-3"
                >
                  <View
                    className="bg-white rounded-2xl border border-ios-border p-4 flex-row items-center"
                    style={styles.cardShadow}
                  >
                    <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-3">
                      <Ionicons
                        name="business-outline"
                        size={24}
                        color="#7C3AED"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-ios-dark font-semibold text-base">
                        {account.bankName}
                      </Text>
                      <Text className="text-ios-grey4 text-sm mt-0.5">
                        Account •••• {account.accountLast4}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#C7C7CC"
                    />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View
                className="bg-white rounded-2xl border border-ios-border p-6 items-center"
                style={styles.cardShadow}
              >
                <Ionicons name="alert-circle-outline" size={32} color="#FF9500" />
                <Text className="text-ios-grey4 text-sm mt-2 text-center">
                  No eligible source accounts. You need at least two bank
                  accounts to make a self-transfer.
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // Step 3: Confirm + PIN
  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center px-5 pt-2 pb-3">
          <TouchableOpacity
            onPress={() => setStep("source")}
            className="w-10 h-10 rounded-full bg-white border border-ios-border items-center justify-center mr-3"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#1C1C1E" />
          </TouchableOpacity>
          <Text className="text-ios-dark text-xl font-bold">
            Confirm Transfer
          </Text>
        </View>
        <View className="flex-1 px-5 justify-center">
          <View className="items-center mb-6">
            <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
              <Ionicons name="swap-horizontal" size={36} color="#7C3AED" />
            </View>
          </View>
          <View
            className="bg-white rounded-3xl border border-ios-border p-5 mb-6"
            style={styles.cardShadow}
          >
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1 items-center">
                <Text className="text-ios-grey4 text-xs mb-1">From</Text>
                <Text className="text-ios-dark font-bold text-base text-center">
                  {sourceAccount?.bankName}
                </Text>
                <Text className="text-ios-grey4 text-sm">
                  •••• {sourceAccount?.accountLast4}
                </Text>
              </View>
              <View className="mx-3">
                <Ionicons name="arrow-forward" size={20} color="#7C3AED" />
              </View>
              <View className="flex-1 items-center">
                <Text className="text-ios-grey4 text-xs mb-1">To</Text>
                <Text className="text-ios-dark font-bold text-base text-center">
                  {destAccount?.bankName}
                </Text>
                <Text className="text-ios-grey4 text-sm">
                  •••• {destAccount?.accountLast4}
                </Text>
              </View>
            </View>
            <View className="border-t border-ios-border pt-4 items-center">
              <Text className="text-ios-grey4 text-sm">Amount</Text>
              <Text className="text-ios-dark text-3xl font-bold mt-1">
                {formatCurrency(parsedAmount)}
              </Text>
            </View>
          </View>
          <GlassButton
            title={processing ? "Processing..." : "Confirm Transfer"}
            onPress={requestVerification}
            loading={processing}
            size="lg"
            fullWidth
            icon={
              <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
            }
            className="mb-3"
          />
          <GlassButton
            title="Cancel"
            onPress={() => router.back()}
            variant="secondary"
            size="lg"
            fullWidth
          />
        </View>
      </SafeAreaView>

      {/* PIN Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowPinModal(false);
          setPin("");
          setPinError("");
        }}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View
            className="bg-white rounded-3xl w-full px-6 pt-6 pb-8"
            style={styles.cardShadow}
          >
            <View className="items-center mb-5">
              <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-3">
                <Ionicons name="lock-closed" size={28} color="#7C3AED" />
              </View>
              <Text className="text-ios-dark text-lg font-bold">
                Enter Account PIN
              </Text>
              <Text className="text-ios-grey4 text-sm mt-1 text-center">
                Enter the PIN for {sourceAccount?.bankName} ••••{" "}
                {sourceAccount?.accountLast4}
              </Text>
            </View>

            <View className="flex-row justify-center gap-3 mb-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <View
                  key={i}
                  className={`w-4 h-4 rounded-full ${
                    i < pin.length ? "bg-purple-600" : "bg-ios-border"
                  }`}
                />
              ))}
            </View>

            {pinError ? (
              <Text className="text-danger text-xs text-center mt-1 mb-2">
                {pinError}
              </Text>
            ) : (
              <View className="h-5 mt-1 mb-2" />
            )}

            <View className="items-center">
              {[[1, 2, 3], [4, 5, 6], [7, 8, 9], [null, 0, "del"]].map(
                (row, ri) => (
                  <View key={ri} className="flex-row gap-4 mb-3">
                    {row.map((key, ki) => {
                      if (key === null) {
                        return <View key={`empty-${ki}`} className="w-20 h-14" />;
                      }
                      if (key === "del") {
                        return (
                          <TouchableOpacity
                            key="del"
                            onPress={() => {
                              setPin((p) => p.slice(0, -1));
                              setPinError("");
                            }}
                            className="w-20 h-14 rounded-2xl bg-ios-bg items-center justify-center"
                          >
                            <Ionicons
                              name="backspace-outline"
                              size={24}
                              color="#8E8E93"
                            />
                          </TouchableOpacity>
                        );
                      }
                      return (
                        <TouchableOpacity
                          key={key}
                          onPress={() => {
                            const next = pin + String(key);
                            if (next.length <= 6) {
                              setPin(next);
                              setPinError("");
                              if (next.length === 6) {
                                handlePinSubmit(next);
                              }
                            }
                          }}
                          className="w-20 h-14 rounded-2xl bg-ios-bg items-center justify-center"
                        >
                          <Text className="text-ios-dark text-xl font-semibold">
                            {key}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )
              )}
            </View>

            <TouchableOpacity
              onPress={() => {
                setShowPinModal(false);
                setPin("");
                setPinError("");
              }}
              className="mt-4"
            >
              <Text className="text-ios-grey4 text-center font-medium">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
});
