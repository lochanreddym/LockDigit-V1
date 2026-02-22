import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Vibration,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useAction, useMutation, useQuery } from "convex/react";
import { useConfirmPayment } from "@/lib/stripe-native";
import { api } from "@/convex/_generated/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassButton } from "@/components/glass";
import { parseQRPaymentData, showPaymentError } from "@/lib/stripe";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import { validatePin } from "@/lib/pin-manager";
import { getPinLength, isFaceIdEnabled } from "@/lib/secure-store";
import * as LocalAuthentication from "expo-local-authentication";

const { width } = Dimensions.get("window");
const SCAN_AREA_SIZE = width * 0.7;

export default function ScanToPayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    billCategory?: string;
    billSubCategory?: string;
  }>();
  const { userId } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;
  const { confirmPayment } = useConfirmPayment();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [paymentData, setPaymentData] = useState<ReturnType<
    typeof parseQRPaymentData
  > | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showAmountEntry, setShowAmountEntry] = useState(false);
  const [sendAmountCents, setSendAmountCents] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualMerchantId, setManualMerchantId] = useState("");
  const [manualMerchantName, setManualMerchantName] = useState("");
  const [manualAmountCents, setManualAmountCents] = useState("");

  // PIN verification state
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
    setManualAmountCents(digits);
  };

  const formattedAmount = (() => {
    const cents = parseInt(manualAmountCents || "0", 10);
    return (cents / 100).toFixed(2);
  })();

  const HIGH_AMOUNT_THRESHOLD = 50000; // $500.00 in cents

  const handleManualPay = () => {
    const amountCents = parseInt(manualAmountCents || "0", 10);
    if (!manualMerchantId.trim() || amountCents <= 0) {
      Alert.alert("Invalid", "Enter merchant ID and amount.");
      return;
    }

    const proceed = () => {
      setPaymentData({
        merchantId: manualMerchantId.trim(),
        merchantName: manualMerchantName.trim() || "Merchant",
        amount: amountCents,
        currency: "usd",
      });
      setShowManualEntry(false);
      setManualMerchantId("");
      setManualMerchantName("");
      setManualAmountCents("");
    };

    if (amountCents >= HIGH_AMOUNT_THRESHOLD) {
      Alert.alert(
        "Large Payment",
        `You're about to pay $${(amountCents / 100).toFixed(2)}. Are you sure you want to proceed?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, Proceed", onPress: proceed },
        ]
      );
    } else {
      proceed();
    }
  };

  const handleSendAmountChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "").replace(/^0+/, "");
    setSendAmountCents(digits);
  };

  const formattedSendAmount = (() => {
    const cents = parseInt(sendAmountCents || "0", 10);
    return (cents / 100).toFixed(2);
  })();

  const handleConfirmSendAmount = () => {
    const amountCents = parseInt(sendAmountCents || "0", 10);
    if (amountCents <= 0) {
      Alert.alert("Invalid Amount", "Please enter an amount to send.");
      return;
    }
    if (!paymentData) return;

    const proceed = () => {
      setPaymentData({ ...paymentData, amount: amountCents, isReceiveMoneyQR: false });
      setShowAmountEntry(false);
      setSendAmountCents("");
    };

    if (amountCents >= HIGH_AMOUNT_THRESHOLD) {
      Alert.alert(
        "Large Transfer",
        `You're about to send $${(amountCents / 100).toFixed(2)} to ${paymentData.merchantName}. Are you sure?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, Proceed", onPress: proceed },
        ]
      );
    } else {
      proceed();
    }
  };

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);

    const data = parseQRPaymentData(result.data);
    if (data) {
      if (data.isReceiveMoneyQR) {
        setPaymentData(data);
        setShowAmountEntry(true);
        setSendAmountCents("");
      } else {
        setPaymentData(data);
      }
    } else {
      Alert.alert(
        "Invalid QR Code",
        "This QR code doesn't contain valid payment information.",
        [{ text: "Scan Again", onPress: () => setScanned(false) }]
      );
    }
  };

  const requestVerification = () => {
    if (!paymentData) return;

    const startVerification = () => {
      setPin("");
      setPinError("");
      setShowPinModal(true);
    };

    if (paymentData.amount >= HIGH_AMOUNT_THRESHOLD) {
      Alert.alert(
        "Confirm Large Payment",
        `You are about to pay $${(paymentData.amount / 100).toFixed(2)} to ${paymentData.merchantName}. Do you want to continue?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, Continue", onPress: startVerification },
        ]
      );
    } else {
      startVerification();
    }
  };

  const handlePinSubmit = useCallback(async (enteredPin: string) => {
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
          [{ text: "OK", onPress: () => { setPaymentData(null); setScanned(false); } }]
        );
      } else {
        setPinError(`Incorrect PIN. ${5 - newAttempts} attempts remaining.`);
        setPin("");
      }
    }
  }, [pinAttempts, paymentData]);

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
    if (!paymentData || !convexUserId) return;

    setProcessing(true);
    try {
      const description =
        params.billCategory && params.billSubCategory
          ? `Bill: ${params.billCategory} - ${params.billSubCategory}`
          : `Payment to ${paymentData.merchantName}`;
      const { clientSecret, paymentIntentId, paymentToken } =
        await createPaymentIntent({
          amount: paymentData.amount,
          currency: paymentData.currency,
          userId: convexUserId,
          description,
          merchantName: paymentData.merchantName,
          recipientPhone: paymentData.merchantId,
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
          "Payment was processed but verification failed. Please contact LockDigit support.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      }
    } catch (error) {
      showPaymentError(error);
    } finally {
      setProcessing(false);
    }
  };

  // Permission handling
  if (!permission) {
    return (
      <View className="flex-1 bg-ios-bg items-center justify-center">
        <Text className="text-ios-grey4">Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-ios-bg">
        <SafeAreaView className="flex-1 items-center justify-center px-8">
          <Ionicons name="camera-outline" size={64} color="#C7C7CC" />
          <Text className="text-ios-dark text-xl font-bold mt-4 text-center">
            Camera Access Required
          </Text>
          <Text className="text-ios-grey4 text-center mt-2 mb-6">
            LockDigit needs camera access to scan QR codes for payments.
          </Text>
          <GlassButton
            title="Grant Permission"
            onPress={requestPermission}
            size="lg"
            fullWidth
          />
          <TouchableOpacity onPress={() => router.back()} className="mt-4">
            <Text className="text-primary">Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // Amount entry view for receive-money QR codes
  if (paymentData && showAmountEntry) {
    return (
      <View className="flex-1 bg-ios-bg">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center px-5 py-3">
            <TouchableOpacity
              onPress={() => {
                setPaymentData(null);
                setScanned(false);
                setShowAmountEntry(false);
                setSendAmountCents("");
              }}
              className="mr-3 p-1"
            >
              <Ionicons name="chevron-back" size={24} color="#0A84FF" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-ios-dark">Send Money</Text>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
          >
            <View className="flex-1 px-5 justify-center">
              <View className="items-center mb-6">
                <View className="w-20 h-20 rounded-full bg-purple-500/10 items-center justify-center mb-4">
                  <Ionicons name="person" size={36} color="#7C3AED" />
                </View>
                <Text className="text-ios-grey4 text-sm">Sending to</Text>
                <Text className="text-ios-dark text-xl font-bold mt-1">
                  {paymentData.merchantName}
                </Text>
                <Text className="text-ios-grey4 text-sm mt-1">
                  {paymentData.merchantId}
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
                    value={formattedSendAmount}
                    onChangeText={handleSendAmountChange}
                    placeholder="0.00"
                    keyboardType="number-pad"
                    className="text-ios-dark text-4xl font-bold ml-1"
                    placeholderTextColor="#C7C7CC"
                    style={{ minWidth: 120 }}
                    autoFocus
                    selection={{
                      start: formattedSendAmount.length,
                      end: formattedSendAmount.length,
                    }}
                  />
                </View>
              </View>

              <GlassButton
                title={`Send $${formattedSendAmount}`}
                onPress={handleConfirmSendAmount}
                size="lg"
                fullWidth
                icon={<Ionicons name="send" size={20} color="#FFFFFF" />}
                className="mb-3"
              />
              <GlassButton
                title="Cancel"
                onPress={() => {
                  setPaymentData(null);
                  setScanned(false);
                  setShowAmountEntry(false);
                  setSendAmountCents("");
                }}
                variant="secondary"
                size="lg"
                fullWidth
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // Payment confirmation view
  if (paymentData) {
    return (
      <View className="flex-1 bg-ios-bg">
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="flex-row items-center px-5 py-3">
            <TouchableOpacity
              onPress={() => {
                setPaymentData(null);
                setScanned(false);
              }}
              className="mr-3 p-1"
            >
              <Ionicons name="chevron-back" size={24} color="#0A84FF" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-ios-dark">Confirm Payment</Text>
          </View>

          <View className="flex-1 px-5 justify-center">
            <View className="items-center mb-6">
              <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
                <Ionicons name="send" size={36} color="#0A84FF" />
              </View>
            </View>

            <View
              className="bg-white rounded-3xl border border-ios-border p-5 mb-6"
              style={styles.cardShadow}
            >
              <View className="items-center py-4">
                <Text className="text-ios-grey4 text-sm">Sending to</Text>
                <Text className="text-ios-dark text-xl font-bold mt-1">
                  {paymentData.merchantName}
                </Text>
                <Text className="text-ios-dark text-4xl font-bold mt-4">
                  {formatCurrency(paymentData.amount)}
                </Text>
                {paymentData.reference && (
                  <Text className="text-ios-grey4 text-sm mt-2">
                    Ref: {paymentData.reference}
                  </Text>
                )}
              </View>
            </View>

            <GlassButton
              title={
                processing
                  ? "Processing..."
                  : `Pay ${formatCurrency(paymentData.amount)}`
              }
              onPress={requestVerification}
              loading={processing}
              size="lg"
              fullWidth
              icon={<Ionicons name="card" size={20} color="#FFFFFF" />}
              className="mb-3"
            />
            <GlassButton
              title="Cancel"
              onPress={() => {
                setPaymentData(null);
                setScanned(false);
              }}
              variant="secondary"
              size="lg"
              fullWidth
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Camera scanner view
  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay */}
      <View style={StyleSheet.absoluteFill} className="items-center justify-center">
        {/* Top overlay */}
        <SafeAreaView className="absolute top-0 left-0 right-0" edges={["top"]}>
          <View className="bg-black/50 px-6 pt-4 pb-6">
            <View className="flex-row items-center">
              <TouchableOpacity onPress={() => router.back()} className="p-2 mr-3">
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <View>
                <Text className="text-white text-xl font-bold">Scan to Pay</Text>
                <Text className="text-white/60 text-sm mt-0.5">
                  Point your camera at a merchant QR code
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>

        {/* Scan frame */}
        <View
          style={{
            width: SCAN_AREA_SIZE,
            height: SCAN_AREA_SIZE,
            borderWidth: 3,
            borderColor: "#0A84FF",
            borderRadius: 24,
          }}
        />

        {/* Bottom overlay */}
        <View className="absolute bottom-0 left-0 right-0 bg-black/50 px-6 py-10 items-center">
          <Text className="text-white/60 text-sm mb-3">
            Align QR code within the frame
          </Text>
          <TouchableOpacity
            onPress={() => setShowManualEntry(true)}
            className="bg-white/20 rounded-xl px-5 py-2.5"
          >
            <Text className="text-white font-medium">Enter merchant ID or number</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* PIN verification modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowPinModal(false); setPin(""); setPinError(""); }}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-white rounded-3xl w-full px-6 pt-6 pb-8" style={styles.cardShadow}>
            <View className="items-center mb-5">
              <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-3">
                <Ionicons name="lock-closed" size={28} color="#0A84FF" />
              </View>
              <Text className="text-ios-dark text-lg font-bold">Verify Your PIN</Text>
              <Text className="text-ios-grey4 text-sm mt-1 text-center">
                Enter your {pinLength}-digit PIN to confirm payment
              </Text>
            </View>

            {/* PIN dots */}
            <View className="flex-row justify-center gap-3 mb-2">
              {Array.from({ length: pinLength }).map((_, i) => (
                <View
                  key={i}
                  className={`w-4 h-4 rounded-full ${
                    i < pin.length ? "bg-primary" : "bg-ios-border"
                  }`}
                />
              ))}
            </View>

            {pinError ? (
              <Text className="text-danger text-xs text-center mt-1 mb-2">{pinError}</Text>
            ) : (
              <View className="h-5 mt-1 mb-2" />
            )}

            {/* Numpad */}
            <View className="items-center">
              {[[1, 2, 3], [4, 5, 6], [7, 8, 9], ["face", 0, "del"]].map((row, ri) => (
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
                            <Ionicons name="scan" size={24} color="#0A84FF" />
                          </TouchableOpacity>
                        );
                      }
                      return <View key="face" className="w-20 h-14" />;
                    }
                    if (key === "del") {
                      return (
                        <TouchableOpacity
                          key="del"
                          onPress={() => { setPin((p) => p.slice(0, -1)); setPinError(""); }}
                          className="w-20 h-14 rounded-2xl bg-ios-bg items-center justify-center"
                        >
                          <Ionicons name="backspace-outline" size={24} color="#8E8E93" />
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
                        <Text className="text-ios-dark text-xl font-semibold">{key}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {faceIdAvailable && hasCard && (
              <Text className="text-ios-grey4 text-xs text-center mt-1">
                Face ID available for card payments
              </Text>
            )}

            <TouchableOpacity
              onPress={() => { setShowPinModal(false); setPin(""); setPinError(""); }}
              className="mt-4"
            >
              <Text className="text-ios-grey4 text-center font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manual entry modal */}
      <Modal
        visible={showManualEntry}
        transparent
        animationType="slide"
        onRequestClose={() => setShowManualEntry(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end"
        >
          <TouchableOpacity
            className="flex-1 bg-black/50"
            activeOpacity={1}
            onPress={() => setShowManualEntry(false)}
          />
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-10">
            <Text className="text-ios-dark text-lg font-bold mb-3">Pay by ID</Text>
            <Text className="text-ios-grey4 text-sm mb-1">Merchant ID or number</Text>
            <TextInput
              value={manualMerchantId}
              onChangeText={setManualMerchantId}
              placeholder="e.g. 9876543210 or merchant@upi"
              className="bg-ios-bg border border-ios-border rounded-xl px-4 py-3 text-ios-dark mb-3"
              placeholderTextColor="#8E8E93"
              keyboardType="default"
            />
            <Text className="text-ios-grey4 text-sm mb-1">Merchant name (optional)</Text>
            <TextInput
              value={manualMerchantName}
              onChangeText={setManualMerchantName}
              placeholder="Store name"
              className="bg-ios-bg border border-ios-border rounded-xl px-4 py-3 text-ios-dark mb-3"
              placeholderTextColor="#8E8E93"
            />
            <Text className="text-ios-grey4 text-sm mb-1">Amount</Text>
            <View className="flex-row items-center bg-ios-bg border border-ios-border rounded-xl mb-5">
              <Text className="text-ios-dark text-base font-medium pl-4">$</Text>
              <TextInput
                value={formattedAmount}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                keyboardType="number-pad"
                className="flex-1 px-2 py-3 text-ios-dark"
                placeholderTextColor="#8E8E93"
                selection={{ start: formattedAmount.length, end: formattedAmount.length }}
              />
            </View>
            <TouchableOpacity
              onPress={handleManualPay}
              className="bg-primary rounded-xl py-3.5 items-center mb-2"
            >
              <Text className="text-white font-semibold">Continue to pay</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowManualEntry(false)} className="py-2">
              <Text className="text-ios-grey4 text-center">Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
