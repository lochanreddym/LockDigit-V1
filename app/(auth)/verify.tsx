import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "@/components/common";
import { GlassCard, GlassButton } from "@/components/glass";
import { verifyOTP, sendOTP } from "@/lib/firebase";

const OTP_LENGTH = 6;

export default function VerifyScreen() {
  const router = useRouter();
  const { phone, name, isNewUser } = useLocalSearchParams<{
    phone: string;
    name: string;
    isNewUser: string;
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
      // Handle paste
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

    // Auto-submit when all digits filled
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
      const user = await verifyOTP(otpCode);
      if (user) {
        router.replace({
          pathname: "/(auth)/create-pin",
          params: {
            phone: phone || "",
            name: name || "",
            isNewUser: isNewUser || "false",
            firebaseUid: user.uid,
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
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-6 justify-center">
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-4 left-6 z-10 p-2"
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Icon */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-full bg-primary/20 items-center justify-center mb-4">
              <Ionicons name="shield-checkmark" size={40} color="#6C63FF" />
            </View>
            <Text className="text-white text-2xl font-bold">
              Verify Your Number
            </Text>
            <Text className="text-white/50 text-base mt-2 text-center">
              Enter the 6-digit code sent to{"\n"}
              <Text className="text-primary font-medium">{phone}</Text>
            </Text>
          </View>

          {/* OTP Input */}
          <GlassCard className="mb-6">
            <View className="flex-row justify-between px-2">
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
                  className="w-12 h-14 text-center text-white text-2xl font-bold border border-glass-border rounded-xl bg-white/5"
                  selectTextOnFocus
                />
              ))}
            </View>

            <GlassButton
              title="Verify"
              onPress={() => handleVerify()}
              loading={loading}
              disabled={otp.join("").length !== OTP_LENGTH}
              size="lg"
              className="mt-6"
            />
          </GlassCard>

          {/* Resend */}
          <View className="items-center">
            <Text className="text-white/40 text-sm">
              Didn't receive the code?
            </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendTimer > 0}
              className="mt-2"
            >
              <Text
                className={`text-sm font-semibold ${
                  resendTimer > 0 ? "text-white/30" : "text-primary"
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
    </ScreenWrapper>
  );
}
