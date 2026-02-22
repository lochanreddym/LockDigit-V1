import React, { useState, useCallback } from "react";
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

type Step = "recipient" | "amount" | "source" | "confirm";

export default function SendToAccountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ recipientId: string }>();
  const { userId } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;

  const accounts = useQuery(
    api.payments.listBankAccounts,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const savedRecipients = useQuery(
    api.payments.listSavedRecipients,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const verifyPin = useMutation(api.payments.verifyPaymentPin);
  const createLocalTransfer = useMutation(api.payments.createLocalTransfer);
  const addRecipient = useMutation(api.payments.addSavedRecipient);

  const preselectedRecipient =
    params.recipientId && params.recipientId !== "new"
      ? savedRecipients?.find((r) => r._id === params.recipientId)
      : null;

  const [step, setStep] = useState<Step>(
    preselectedRecipient ? "amount" : "recipient"
  );

  // Recipient fields
  const [recipientName, setRecipientName] = useState(
    preselectedRecipient?.recipientName || ""
  );
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState(
    preselectedRecipient?.routingNumber || ""
  );
  const [bankName, setBankName] = useState(
    preselectedRecipient?.bankName || ""
  );
  const [isNewRecipient, setIsNewRecipient] = useState(!preselectedRecipient);
  const [recipientAccountLast4, setRecipientAccountLast4] = useState(
    preselectedRecipient?.accountLast4 || ""
  );

  // Transfer fields
  const [amountCents, setAmountCents] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState<Id<"bankAccounts"> | null>(null);
  const [processing, setProcessing] = useState(false);

  // PIN
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinAttempts, setPinAttempts] = useState(0);

  const sourceAccount = sourceAccountId
    ? accounts?.find((a) => a._id === sourceAccountId)
    : null;
  const bankSources = accounts?.filter((a) => a.type !== "card");

  const parsedAmount = parseInt(amountCents || "0", 10);
  const formattedAmount = (parsedAmount / 100).toFixed(2);

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "").replace(/^0+/, "");
    setAmountCents(digits);
  };

  const handleRecipientContinue = () => {
    if (!recipientName.trim()) {
      Alert.alert("Missing Info", "Please enter the recipient's name.");
      return;
    }
    if (isNewRecipient) {
      if (!accountNumber.trim() || accountNumber.length < 4) {
        Alert.alert("Missing Info", "Please enter a valid account number.");
        return;
      }
      if (!routingNumber.trim() || routingNumber.length !== 9) {
        Alert.alert(
          "Missing Info",
          "Please enter a valid 9-digit routing number."
        );
        return;
      }
      if (!bankName.trim()) {
        Alert.alert("Missing Info", "Please enter the bank name.");
        return;
      }
      setRecipientAccountLast4(accountNumber.slice(-4));
    }
    setStep("amount");
  };

  const handleAmountContinue = () => {
    if (parsedAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter an amount to send.");
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
              "You've exceeded the maximum number of PIN attempts.",
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
    if (!convexUserId || !sourceAccount) return;
    setProcessing(true);
    try {
      if (isNewRecipient) {
        await addRecipient({
          userId: convexUserId,
          recipientName: recipientName.trim(),
          accountLast4: recipientAccountLast4,
          routingNumber: routingNumber.trim(),
          bankName: bankName.trim(),
        });
      }

      const result = await createLocalTransfer({
        userId: convexUserId,
        amount: parsedAmount,
        type: "transfer",
        description: `Transfer to ${recipientName} (${bankName} ••${recipientAccountLast4})`,
        merchantName: recipientName,
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

  if (!accounts || !savedRecipients) {
    return (
      <View className="flex-1 bg-ios-bg items-center justify-center">
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  // Step 1: Recipient details
  if (step === "recipient") {
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
              Recipient Details
            </Text>
          </View>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
          >
            <ScrollView
              className="flex-1 px-5"
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              <View
                className="bg-white rounded-3xl border border-ios-border p-5 mt-4"
                style={styles.cardShadow}
              >
                <Text className="text-ios-dark font-semibold text-base mb-4">
                  Add New Recipient
                </Text>

                <Text className="text-ios-grey4 text-xs mb-1.5 ml-1">
                  Recipient Name
                </Text>
                <TextInput
                  value={recipientName}
                  onChangeText={setRecipientName}
                  placeholder="John Doe"
                  className="bg-ios-bg rounded-xl px-4 py-3.5 text-ios-dark text-base mb-4"
                  placeholderTextColor="#C7C7CC"
                />

                <Text className="text-ios-grey4 text-xs mb-1.5 ml-1">
                  Account Number
                </Text>
                <TextInput
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="Enter account number"
                  keyboardType="number-pad"
                  className="bg-ios-bg rounded-xl px-4 py-3.5 text-ios-dark text-base mb-4"
                  placeholderTextColor="#C7C7CC"
                />

                <Text className="text-ios-grey4 text-xs mb-1.5 ml-1">
                  Routing Number (9 digits)
                </Text>
                <TextInput
                  value={routingNumber}
                  onChangeText={(t) =>
                    setRoutingNumber(t.replace(/[^0-9]/g, "").slice(0, 9))
                  }
                  placeholder="123456789"
                  keyboardType="number-pad"
                  maxLength={9}
                  className="bg-ios-bg rounded-xl px-4 py-3.5 text-ios-dark text-base mb-4"
                  placeholderTextColor="#C7C7CC"
                />

                <Text className="text-ios-grey4 text-xs mb-1.5 ml-1">
                  Bank Name
                </Text>
                <TextInput
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="Bank of America"
                  className="bg-ios-bg rounded-xl px-4 py-3.5 text-ios-dark text-base"
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View className="mt-6">
                <GlassButton
                  title="Continue"
                  onPress={handleRecipientContinue}
                  size="lg"
                  fullWidth
                  icon={
                    <Ionicons
                      name="arrow-forward"
                      size={20}
                      color="#FFFFFF"
                    />
                  }
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // Step 2: Amount
  if (step === "amount") {
    return (
      <View className="flex-1 bg-ios-bg">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center px-5 pt-2 pb-3">
            <TouchableOpacity
              onPress={() =>
                setStep(preselectedRecipient ? "recipient" : "recipient")
              }
              className="w-10 h-10 rounded-full bg-white border border-ios-border items-center justify-center mr-3"
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color="#1C1C1E" />
            </TouchableOpacity>
            <Text className="text-ios-dark text-xl font-bold">
              Enter Amount
            </Text>
          </View>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
          >
            <View className="flex-1 px-5 justify-center">
              <View className="items-center mb-6">
                <View className="w-16 h-16 rounded-full bg-blue-500/10 items-center justify-center mb-3">
                  <Text className="text-blue-600 text-2xl font-bold">
                    {recipientName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text className="text-ios-dark text-lg font-bold">
                  {recipientName}
                </Text>
                <Text className="text-ios-grey4 text-sm">
                  {bankName} •••• {recipientAccountLast4}
                </Text>
              </View>
              <View
                className="bg-white rounded-3xl border border-ios-border p-5 mb-6"
                style={styles.cardShadow}
              >
                <Text className="text-ios-grey4 text-sm mb-3 text-center">
                  Enter amount to send
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
                onPress={handleAmountContinue}
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

  // Step 3: Source account
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
          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <Text className="text-ios-grey4 text-sm mb-4">
              Choose the account to send {formatCurrency(parsedAmount)} from
            </Text>
            {bankSources && bankSources.length > 0 ? (
              bankSources.map((account) => (
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
                <Ionicons
                  name="alert-circle-outline"
                  size={32}
                  color="#FF9500"
                />
                <Text className="text-ios-grey4 text-sm mt-2 text-center">
                  No bank accounts available to send from.
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // Step 4: Confirm + PIN
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
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 40, justifyContent: "center", flexGrow: 1 }}
        >
          <View className="items-center mb-6">
            <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
              <Ionicons name="send" size={36} color="#7C3AED" />
            </View>
          </View>
          <View
            className="bg-white rounded-3xl border border-ios-border p-5 mb-6"
            style={styles.cardShadow}
          >
            <View className="mb-4 pb-4 border-b border-ios-border">
              <Text className="text-ios-grey4 text-xs mb-1">To</Text>
              <Text className="text-ios-dark font-bold text-base">
                {recipientName}
              </Text>
              <Text className="text-ios-grey4 text-sm">
                {bankName} •••• {recipientAccountLast4}
              </Text>
              {isNewRecipient && (
                <Text className="text-ios-grey4 text-sm">
                  Routing: {routingNumber}
                </Text>
              )}
            </View>
            <View className="mb-4 pb-4 border-b border-ios-border">
              <Text className="text-ios-grey4 text-xs mb-1">From</Text>
              <Text className="text-ios-dark font-bold text-base">
                {sourceAccount?.bankName}
              </Text>
              <Text className="text-ios-grey4 text-sm">
                •••• {sourceAccount?.accountLast4}
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-ios-grey4 text-sm">Amount</Text>
              <Text className="text-ios-dark text-3xl font-bold mt-1">
                {formatCurrency(parsedAmount)}
              </Text>
            </View>
          </View>
          <GlassButton
            title={processing ? "Processing..." : "Confirm & Send"}
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
        </ScrollView>
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
                        return (
                          <View key={`empty-${ki}`} className="w-20 h-14" />
                        );
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
