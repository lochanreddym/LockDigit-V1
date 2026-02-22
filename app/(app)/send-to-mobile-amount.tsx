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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAction, useMutation, useQuery } from "convex/react";
import { useConfirmPayment } from "@/lib/stripe-native";
import { api } from "@/convex/_generated/api";
import { GlassButton } from "@/components/glass";
import { formatCurrency, } from "@/lib/utils";
import { showPaymentError } from "@/lib/stripe";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import { validatePin } from "@/lib/pin-manager";
import { getPinLength, isFaceIdEnabled } from "@/lib/secure-store";
import * as LocalAuthentication from "expo-local-authentication";

const HIGH_AMOUNT_THRESHOLD = 50000;

export default function SendToMobileAmountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone: string; name: string }>();
  const { userId } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;
  const { confirmPayment } = useConfirmPayment();

  const recipientPhone = params.phone || "";
  const recipientName = params.name || recipientPhone;

  const [amountCents, setAmountCents] = useState("");
  const [step, setStep] = useState<"amount" | "confirm">("amount");
  const [processing, setProcessing] = useState(false);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinLength, setPinLength] = useState(6);
  const [pinError, setPinError] = useState("");
  const [pinAttempts, setPinAttempts] = useState(0);
  const [faceIdAvailable, setFaceIdAvailable] = useState(false);
  const [hasCard, setHasCard] = useState(false);

  const bankAccounts = useQuery(
    api.payments.listBankAccounts,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  const createPaymentIntent = useAction(api.payments.createPaymentIntent);
  const verifyAndComplete = useMutation(api.payments.verifyAndCompletePayment);

  useEffect(() => {
    (async () => {
      const len = await getPinLength();
      setPinLength(len);
      const faceIdOn = await isFaceIdEnabled();
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setFaceIdAvailable(faceIdOn && compatible && enrolled);
    })();
  }, []);

  useEffect(() => {
    if (bankAccounts) {
      setHasCard(bankAccounts.some((a: { type?: string }) => a.type === "card"));
    }
  }, [bankAccounts]);

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "").replace(/^0+/, "");
    setAmountCents(digits);
  };

  const formattedAmount = (() => {
    const cents = parseInt(amountCents || "0", 10);
    return (cents / 100).toFixed(2);
  })();

  const parsedAmount = parseInt(amountCents || "0", 10);

  const handleContinue = () => {
    if (parsedAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter an amount to send.");
      return;
    }

    const proceed = () => setStep("confirm");

    if (parsedAmount >= HIGH_AMOUNT_THRESHOLD) {
      Alert.alert(
        "Large Transfer",
        `You're about to send $${(parsedAmount / 100).toFixed(2)} to ${recipientName}. Continue?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, Proceed", onPress: proceed },
        ]
      );
    } else {
      proceed();
    }
  };

  const requestVerification = () => {
    setPin("");
    setPinError("");
    setShowPinModal(true);
  };

  const handlePinSubmit = useCallback(
    async (enteredPin: string) => {
      const valid = await validatePin(enteredPin);
      if (valid) {
        setShowPinModal(false);
        setPin("");
        setPinError("");
        setPinAttempts(0);
        executePayment();
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
          setPinError(`Incorrect PIN. ${5 - newAttempts} attempts remaining.`);
          setPin("");
        }
      }
    },
    [pinAttempts]
  );

  const handleFaceId = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Verify your identity to confirm payment",
      fallbackLabel: "Use PIN",
      disableDeviceFallback: true,
    });
    if (result.success) {
      setShowPinModal(false);
      setPin("");
      executePayment();
    }
  };

  const executePayment = async () => {
    if (!convexUserId) return;

    setProcessing(true);
    try {
      const { clientSecret, paymentIntentId, paymentToken } =
        await createPaymentIntent({
          amount: parsedAmount,
          currency: "usd",
          userId: convexUserId,
          description: `Transfer to ${recipientName}`,
          merchantName: recipientName,
          recipientPhone,
        });

      const { error } = await confirmPayment(clientSecret, {
        paymentMethodType: "Card",
      });

      if (error) {
        showPaymentError(error);
        return;
      }

      const result = await verifyAndComplete({
        stripePaymentIntentId: paymentIntentId,
        paymentToken,
        paymentMethod: "Card",
      });

      if (result.verified && result.transactionId) {
        router.replace({
          pathname: "/(app)/payment-success",
          params: { transactionId: result.transactionId },
        });
      } else {
        Alert.alert(
          "Verification Failed",
          "Payment was processed but verification failed. Please contact support.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      }
    } catch (error) {
      showPaymentError(error);
    } finally {
      setProcessing(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name[0] || "?").toUpperCase();
  };

  // Amount entry step
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
              Send Money
            </Text>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
          >
            <View className="flex-1 px-5 justify-center">
              <View className="items-center mb-6">
                <View className="w-20 h-20 rounded-full bg-purple-500/10 items-center justify-center mb-3">
                  <Text className="text-purple-600 text-2xl font-bold">
                    {getInitials(recipientName)}
                  </Text>
                </View>
                <Text className="text-ios-dark text-lg font-bold">
                  {recipientName}
                </Text>
                <Text className="text-ios-grey4 text-sm mt-0.5">
                  {recipientPhone}
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
                onPress={handleContinue}
                size="lg"
                fullWidth
                icon={<Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // Confirm step
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
            Confirm Transfer
          </Text>
        </View>

        <View className="flex-1 px-5 justify-center">
          <View className="items-center mb-6">
            <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
              <Ionicons name="send" size={36} color="#7C3AED" />
            </View>
          </View>

          <View
            className="bg-white rounded-3xl border border-ios-border p-5 mb-6"
            style={styles.cardShadow}
          >
            <View className="items-center py-4">
              <Text className="text-ios-grey4 text-sm">Sending to</Text>
              <Text className="text-ios-dark text-xl font-bold mt-1">
                {recipientName}
              </Text>
              <Text className="text-ios-grey4 text-sm mt-1">
                {recipientPhone}
              </Text>
              <Text className="text-ios-dark text-4xl font-bold mt-4">
                {formatCurrency(parsedAmount)}
              </Text>
            </View>
          </View>

          <GlassButton
            title={
              processing
                ? "Processing..."
                : `Send ${formatCurrency(parsedAmount)}`
            }
            onPress={requestVerification}
            loading={processing}
            size="lg"
            fullWidth
            icon={<Ionicons name="send" size={20} color="#FFFFFF" />}
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

      {/* PIN modal */}
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
                Verify Your PIN
              </Text>
              <Text className="text-ios-grey4 text-sm mt-1 text-center">
                Enter your {pinLength}-digit PIN to confirm transfer
              </Text>
            </View>

            <View className="flex-row justify-center gap-3 mb-2">
              {Array.from({ length: pinLength }).map((_, i) => (
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
              {[[1, 2, 3], [4, 5, 6], [7, 8, 9], ["face", 0, "del"]].map(
                (row, ri) => (
                  <View key={ri} className="flex-row gap-4 mb-3">
                    {row.map((key) => {
                      if (key === "face") {
                        if (faceIdAvailable && hasCard) {
                          return (
                            <TouchableOpacity
                              key="face"
                              onPress={handleFaceId}
                              className="w-20 h-14 rounded-2xl bg-ios-bg items-center justify-center"
                            >
                              <Ionicons
                                name="scan"
                                size={24}
                                color="#7C3AED"
                              />
                            </TouchableOpacity>
                          );
                        }
                        return <View key="face" className="w-20 h-14" />;
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
                            if (next.length <= pinLength) {
                              setPin(next);
                              setPinError("");
                              if (next.length === pinLength) {
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

            {faceIdAvailable && hasCard && (
              <Text className="text-ios-grey4 text-xs text-center mt-1">
                Face ID available for card payments
              </Text>
            )}

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
