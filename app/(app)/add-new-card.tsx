import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import { sendOTP, verifyOTP } from "@/lib/firebase";
import {
  detectCardBrand,
  formatCardNumber,
  extractLast4,
  ISSUING_BANKS,
  type CardBrand,
} from "@/lib/card-utils";

type Step = "details" | "otp" | "saving";

const OTP_LENGTH = 6;

export default function AddNewCardScreen() {
  const router = useRouter();
  const { userId, phone } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;

  const [step, setStep] = useState<Step>("details");

  // Card detail fields
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [showBankPicker, setShowBankPicker] = useState(false);

  // OTP fields
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(""));
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [saving, setSaving] = useState(false);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const addBankAccount = useMutation(api.payments.addBankAccount);

  const rawDigits = cardNumber.replace(/\D/g, "");
  const detectedBrand: CardBrand = detectCardBrand(rawDigits);
  const maxCvv = detectedBrand === "Amex" ? 4 : 3;

  const expiryValid =
    /^\d{2}$/.test(expiryMonth) &&
    parseInt(expiryMonth, 10) >= 1 &&
    parseInt(expiryMonth, 10) <= 12 &&
    /^\d{2}$/.test(expiryYear);

  const canContinue =
    cardholderName.trim().length >= 2 &&
    rawDigits.length >= 15 &&
    expiryValid &&
    cvv.length >= 3 &&
    selectedBank.length > 0;

  // Resend countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleContinueToOtp = async () => {
    if (!canContinue || !phone) {
      if (!phone) Alert.alert("Error", "No phone number on file.");
      return;
    }
    try {
      setOtpLoading(true);
      await sendOTP(phone);
      setResendTimer(30);
      setStep("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to send OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];

    if (value.length > 1) {
      const chars = value.split("").slice(0, OTP_LENGTH);
      chars.forEach((ch, i) => {
        if (index + i < OTP_LENGTH) next[index + i] = ch;
      });
      setOtp(next);
      const ni = Math.min(index + chars.length, OTP_LENGTH - 1);
      otpRefs.current[ni]?.focus();
    } else {
      next[index] = value;
      setOtp(next);
      if (value && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
    }

    const full = next.join("");
    if (full.length === OTP_LENGTH) handleVerifyOtp(full);
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
      const next = [...otp];
      next[index - 1] = "";
      setOtp(next);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || !phone) return;
    try {
      await sendOTP(phone);
      setResendTimer(30);
      setOtp(new Array(OTP_LENGTH).fill(""));
      otpRefs.current[0]?.focus();
      Alert.alert("Code Sent", "A new verification code has been sent.");
    } catch {
      Alert.alert("Error", "Failed to resend code.");
    }
  };

  const handleVerifyOtp = async (code?: string) => {
    const otpCode = code || otp.join("");
    if (otpCode.length !== OTP_LENGTH) return;

    setOtpLoading(true);
    try {
      const user = await verifyOTP(otpCode);
      if (user) {
        await saveCard();
      } else {
        Alert.alert("Verification Failed", "Invalid code. Please try again.");
        setOtp(new Array(OTP_LENGTH).fill(""));
        otpRefs.current[0]?.focus();
      }
    } catch (e: any) {
      Alert.alert("Verification Failed", e?.message || "Invalid code.");
      setOtp(new Array(OTP_LENGTH).fill(""));
      otpRefs.current[0]?.focus();
    } finally {
      setOtpLoading(false);
    }
  };

  const saveCard = async () => {
    if (!convexUserId) return;
    setSaving(true);
    try {
      const bankLabel =
        ISSUING_BANKS.find((b) => b.id === selectedBank)?.label ?? selectedBank;

      await addBankAccount({
        userId: convexUserId,
        bankName: bankLabel,
        accountLast4: extractLast4(cardNumber),
        cardholderName: cardholderName.trim().toUpperCase(),
        isDefault: false,
        type: "card",
        expiryMonth: expiryMonth.trim(),
        expiryYear: expiryYear.trim(),
        brand: detectedBrand !== "Unknown" ? detectedBrand : undefined,
      });
      Alert.alert("Card Linked", "Your card has been added successfully.", [
        { text: "OK", onPress: () => router.replace("/(app)/my-wallet") },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not add card.");
    } finally {
      setSaving(false);
    }
  };

  const brandIcon = (): string => {
    switch (detectedBrand) {
      case "Visa":
        return "card";
      case "Mastercard":
        return "card";
      case "Amex":
        return "card";
      case "Discover":
        return "card";
      default:
        return "card-outline";
    }
  };

  const brandColor = (): string => {
    switch (detectedBrand) {
      case "Visa":
        return "#1A1F71";
      case "Mastercard":
        return "#EB001B";
      case "Amex":
        return "#006FCF";
      case "Discover":
        return "#FF6600";
      default:
        return "#8E8E93";
    }
  };

  const headerTitle = (): string => {
    switch (step) {
      case "details":
        return "Add New Card";
      case "otp":
        return "Verify Card";
      default:
        return "Add New Card";
    }
  };

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          {/* Header */}
          <View className="flex-row items-center px-5 py-3 border-b border-ios-border">
            <TouchableOpacity
              onPress={() => {
                if (step === "otp") setStep("details");
                else router.back();
              }}
              className="mr-3 p-1"
            >
              <Ionicons name="chevron-back" size={24} color="#0A84FF" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-ios-dark flex-1">
              {headerTitle()}
            </Text>
            {step === "details" && rawDigits.length >= 1 && (
              <View className="flex-row items-center">
                <Ionicons name={brandIcon() as any} size={20} color={brandColor()} />
                <Text
                  className="ml-1.5 text-sm font-semibold"
                  style={{ color: brandColor() }}
                >
                  {detectedBrand !== "Unknown" ? detectedBrand : ""}
                </Text>
              </View>
            )}
          </View>

          <ScrollView
            className="flex-1 px-5 pt-6"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === "details" && (
              <>
                {/* Cardholder Name */}
                <Text className="text-ios-grey4 text-xs font-semibold uppercase tracking-wide mb-2">
                  Name on Card
                </Text>
                <TextInput
                  value={cardholderName}
                  onChangeText={setCardholderName}
                  placeholder="JOHN DOE"
                  autoCapitalize="characters"
                  className="bg-ios-bg border border-ios-border rounded-xl px-4 py-3.5 text-ios-dark mb-5"
                  placeholderTextColor="#C7C7CC"
                />

                {/* Card Number */}
                <Text className="text-ios-grey4 text-xs font-semibold uppercase tracking-wide mb-2">
                  Card Number
                </Text>
                <TextInput
                  value={formatCardNumber(cardNumber)}
                  onChangeText={(t) => setCardNumber(t.replace(/\D/g, "").slice(0, 16))}
                  placeholder="4242 4242 4242 4242"
                  keyboardType="number-pad"
                  maxLength={19}
                  className="bg-ios-bg border border-ios-border rounded-xl px-4 py-3.5 text-ios-dark mb-5 font-mono"
                  placeholderTextColor="#C7C7CC"
                />

                {/* Issuing Bank */}
                <Text className="text-ios-grey4 text-xs font-semibold uppercase tracking-wide mb-2">
                  Issuing Bank
                </Text>
                <TouchableOpacity
                  onPress={() => setShowBankPicker(!showBankPicker)}
                  className="bg-ios-bg border border-ios-border rounded-xl px-4 py-3.5 flex-row items-center justify-between mb-2"
                >
                  <Text
                    className={
                      selectedBank ? "text-ios-dark" : "text-[#C7C7CC]"
                    }
                  >
                    {selectedBank
                      ? ISSUING_BANKS.find((b) => b.id === selectedBank)?.label
                      : "Select your bank"}
                  </Text>
                  <Ionicons
                    name={showBankPicker ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#8E8E93"
                  />
                </TouchableOpacity>
                {showBankPicker && (
                  <View className="bg-white border border-ios-border rounded-xl mb-3 overflow-hidden">
                    {ISSUING_BANKS.map((bank) => (
                      <TouchableOpacity
                        key={bank.id}
                        onPress={() => {
                          setSelectedBank(bank.id);
                          setShowBankPicker(false);
                        }}
                        className="px-4 py-3 border-b border-ios-border flex-row items-center justify-between"
                      >
                        <Text
                          className={`text-base ${
                            selectedBank === bank.id
                              ? "text-primary font-semibold"
                              : "text-ios-dark"
                          }`}
                        >
                          {bank.label}
                        </Text>
                        {selectedBank === bank.id && (
                          <Ionicons name="checkmark" size={20} color="#0A84FF" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {!showBankPicker && <View className="mb-3" />}

                {/* Expiry + CVV row */}
                <View className="flex-row gap-3 mb-5">
                  <View className="flex-1">
                    <Text className="text-ios-grey4 text-xs font-semibold uppercase tracking-wide mb-2">
                      Valid Through
                    </Text>
                    <View className="flex-row gap-2">
                      <TextInput
                        value={expiryMonth}
                        onChangeText={(t) =>
                          setExpiryMonth(t.replace(/\D/g, "").slice(0, 2))
                        }
                        placeholder="MM"
                        keyboardType="number-pad"
                        maxLength={2}
                        className="flex-1 bg-ios-bg border border-ios-border rounded-xl px-3 py-3.5 text-ios-dark text-center"
                        placeholderTextColor="#C7C7CC"
                      />
                      <Text className="text-ios-grey4 text-lg self-center">/</Text>
                      <TextInput
                        value={expiryYear}
                        onChangeText={(t) =>
                          setExpiryYear(t.replace(/\D/g, "").slice(0, 2))
                        }
                        placeholder="YY"
                        keyboardType="number-pad"
                        maxLength={2}
                        className="flex-1 bg-ios-bg border border-ios-border rounded-xl px-3 py-3.5 text-ios-dark text-center"
                        placeholderTextColor="#C7C7CC"
                      />
                    </View>
                  </View>
                  <View className="w-28">
                    <Text className="text-ios-grey4 text-xs font-semibold uppercase tracking-wide mb-2">
                      CVV
                    </Text>
                    <TextInput
                      value={cvv}
                      onChangeText={(t) =>
                        setCvv(t.replace(/\D/g, "").slice(0, maxCvv))
                      }
                      placeholder={"•".repeat(maxCvv)}
                      keyboardType="number-pad"
                      maxLength={maxCvv}
                      secureTextEntry
                      className="bg-ios-bg border border-ios-border rounded-xl px-3 py-3.5 text-ios-dark text-center"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>

                {/* Continue button */}
                <TouchableOpacity
                  onPress={handleContinueToOtp}
                  disabled={!canContinue || otpLoading}
                  className="bg-primary rounded-2xl py-4 items-center mb-4"
                  style={[
                    styles.buttonShadow,
                    (!canContinue || otpLoading) && { opacity: 0.5 },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-semibold text-base">
                    {otpLoading ? "Sending OTP..." : "Continue"}
                  </Text>
                </TouchableOpacity>

                <Text className="text-ios-grey4 text-xs text-center leading-4">
                  Your card number and CVV are never stored.{"\n"}
                  Only the last 4 digits are saved for identification.
                </Text>
              </>
            )}

            {step === "otp" && (
              <>
                {/* OTP verification step */}
                <View className="items-center mb-8">
                  <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
                    <Ionicons
                      name="shield-checkmark"
                      size={40}
                      color="#0A84FF"
                    />
                  </View>
                  <Text className="text-ios-dark text-2xl font-bold">
                    Verify Your Card
                  </Text>
                  <Text className="text-ios-grey4 text-base mt-2 text-center">
                    Enter the 6-digit code sent to{"\n"}
                    <Text className="text-primary font-medium">{phone}</Text>
                  </Text>
                </View>

                <View
                  className="bg-white rounded-3xl border border-ios-border p-5 mb-6"
                  style={styles.cardShadow}
                >
                  <View className="flex-row justify-between mb-6">
                    {otp.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref: TextInput | null) => {
                          otpRefs.current[index] = ref;
                        }}
                        value={digit}
                        onChangeText={(v) => handleOtpChange(v, index)}
                        onKeyPress={({ nativeEvent }) =>
                          handleOtpKeyPress(nativeEvent.key, index)
                        }
                        keyboardType="number-pad"
                        maxLength={1}
                        className="w-12 h-14 text-center text-ios-dark text-2xl font-bold border border-ios-borderLight rounded-xl bg-ios-bg"
                        style={[digit ? styles.activeBorder : undefined]}
                        selectTextOnFocus
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    onPress={() => handleVerifyOtp()}
                    disabled={otpLoading || saving || otp.join("").length !== OTP_LENGTH}
                    className="bg-primary rounded-2xl py-4"
                    style={[
                      styles.buttonShadow,
                      (otpLoading || saving || otp.join("").length !== OTP_LENGTH) && {
                        opacity: 0.4,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text className="text-white text-center font-semibold text-base">
                      {saving
                        ? "Linking Card..."
                        : otpLoading
                          ? "Verifying..."
                          : "Verify & Link Card"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Resend */}
                <View className="items-center">
                  <Text className="text-ios-grey4 text-sm">
                    Didn't receive the code?
                  </Text>
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={resendTimer > 0}
                    className="mt-2"
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        resendTimer > 0 ? "text-ios-grey3" : "text-primary"
                      }`}
                    >
                      {resendTimer > 0
                        ? `Resend in ${resendTimer}s`
                        : "Resend Code"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  activeBorder: {
    borderColor: "#0A84FF",
    borderWidth: 2,
  },
  buttonShadow: {
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
});
