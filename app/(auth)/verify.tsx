import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { verifyOTP, sendOTP } from "@/lib/firebase";

const OTP_LENGTH = 6;

export default function VerifyScreen() {
  const router = useRouter();
  const { phone, name, isNewUser, simulatorTest, resetPin } = useLocalSearchParams<{
    phone: string;
    name: string;
    isNewUser: string;
    simulatorTest?: string;
    resetPin?: string;
  }>();

  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Auto-focus first input
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];

    if (value.length > 1) {
      const chars = value.split("").slice(0, OTP_LENGTH);
      chars.forEach((char, i) => {
        if (index + i < OTP_LENGTH) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + chars.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
    } else {
      newOtp[index] = value;
      setOtp(newOtp);
      if (value && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }

    const fullOtp = newOtp.join("");
    if (fullOtp.length === OTP_LENGTH) {
      handleVerify(fullOtp);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join("");
    if (otpCode.length !== OTP_LENGTH) {
      Alert.alert("Invalid Code", "Please enter the complete verification code.");
      return;
    }

    setLoading(true);
    try {
      if (simulatorTest === "true") {
        // iOS Simulator: skip real Firebase verify and continue to create PIN for testing
        router.replace({
          pathname: "/(auth)/create-pin",
          params: {
            phone: phone || "",
            name: name || "",
            isNewUser: isNewUser || "false",
            ...(resetPin === "true" && { resetPin: "true" }),
          },
        });
        setLoading(false);
        return;
      }

      const user = await verifyOTP(otpCode);
      if (user) {
        router.replace({
          pathname: "/(auth)/create-pin",
          params: {
            phone: phone || "",
            name: name || "",
            isNewUser: isNewUser || "false",
            firebaseUid: user.uid,
            ...(resetPin === "true" && { resetPin: "true" }),
          },
        });
      } else {
        Alert.alert("Verification Failed", "Invalid code. Please try again.");
      }
    } catch (error: any) {
      console.error("OTP verification failed:", error);
      Alert.alert(
        "Verification Failed",
        error?.message || "Invalid verification code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || !phone) return;
    try {
      await sendOTP(phone);
      setResendTimer(30);
      setOtp(new Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      Alert.alert("Code Sent", "A new verification code has been sent.");
    } catch (error: any) {
      Alert.alert("Error", "Failed to resend code. Please try again.");
    }
  };

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          {/* Header */}
          <View className="flex-row items-center px-5 py-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-3 p-1"
            >
              <Ionicons name="chevron-back" size={24} color="#0A84FF" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-ios-dark">Verification</Text>
          </View>

          <View className="flex-1 px-5 pt-6">
            {/* Icon */}
            <View className="items-center mb-8">
              <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
                <Ionicons name="shield-checkmark" size={40} color="#0A84FF" />
              </View>
              <Text className="text-ios-dark text-2xl font-bold">
                Verify Your Number
              </Text>
              <Text className="text-ios-grey4 text-base mt-2 text-center">
                {simulatorTest === "true"
                  ? "Simulator: enter any 6 digits to continue testing."
                  : null}
                {simulatorTest !== "true" && "Enter the 6-digit code sent to\n"}
                {simulatorTest !== "true" && (
                  <Text className="text-primary font-medium">{phone}</Text>
                )}
              </Text>
            </View>

            {/* OTP Input */}
            <View
              className="bg-white rounded-3xl border border-ios-border p-5 mb-6"
              style={styles.cardShadow}
            >
              <View className="flex-row justify-between mb-6">
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref: TextInput | null) => {
                      inputRefs.current[index] = ref;
                    }}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={({ nativeEvent }) =>
                      handleKeyPress(nativeEvent.key, index)
                    }
                    keyboardType="number-pad"
                    maxLength={1}
                    className="w-12 h-14 text-center text-ios-dark text-2xl font-bold border border-ios-borderLight rounded-xl bg-ios-bg"
                    style={[digit && styles.activeBorder]}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <TouchableOpacity
                onPress={() => handleVerify()}
                disabled={loading || otp.join("").length !== OTP_LENGTH}
                className="bg-primary rounded-2xl py-4"
                style={[
                  styles.buttonShadow,
                  (loading || otp.join("").length !== OTP_LENGTH) && {
                    opacity: 0.4,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text className="text-white text-center font-semibold text-base">
                  {loading ? "Verifying..." : "Verify"}
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
          </View>
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
