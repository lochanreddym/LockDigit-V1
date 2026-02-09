import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "@/components/common";
import { GlassCard, GlassButton, GlassInput } from "@/components/glass";
import { sendOTP } from "@/lib/firebase";

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert("Invalid Phone", "Please enter a valid phone number with country code.");
      return;
    }

    if (isNewUser && !name.trim()) {
      Alert.alert("Name Required", "Please enter your name to create an account.");
      return;
    }

    setLoading(true);
    try {
      // Format phone number with + prefix if missing
      const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
      await sendOTP(formattedPhone);
      router.push({
        pathname: "/(auth)/verify",
        params: {
          phone: formattedPhone,
          name: isNewUser ? name.trim() : "",
          isNewUser: isNewUser ? "true" : "false",
        },
      });
    } catch (error: any) {
      console.error("OTP send failed:", error);
      Alert.alert(
        "Verification Failed",
        error?.message || "Failed to send verification code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-6 justify-center">
          {/* Logo */}
          <View className="items-center mb-10">
            <View className="w-20 h-20 rounded-2xl bg-primary items-center justify-center mb-4">
              <Text className="text-white text-3xl font-bold">L</Text>
            </View>
            <Text className="text-white text-2xl font-bold">
              Welcome to LockDigit
            </Text>
            <Text className="text-white/50 text-base mt-2 text-center">
              Your secure digital identity wallet
            </Text>
          </View>

          {/* Form */}
          <GlassCard className="mb-6">
            {/* Toggle between login/signup */}
            <View className="flex-row mb-6 bg-white/5 rounded-xl p-1">
              <TouchableOpacity
                onPress={() => setIsNewUser(false)}
                className={`flex-1 py-2.5 rounded-lg ${!isNewUser ? "bg-primary" : ""}`}
              >
                <Text
                  className={`text-center font-semibold ${
                    !isNewUser ? "text-white" : "text-white/50"
                  }`}
                >
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsNewUser(true)}
                className={`flex-1 py-2.5 rounded-lg ${isNewUser ? "bg-primary" : ""}`}
              >
                <Text
                  className={`text-center font-semibold ${
                    isNewUser ? "text-white" : "text-white/50"
                  }`}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {isNewUser && (
              <GlassInput
                label="Full Name"
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                icon={
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="rgba(255,255,255,0.5)"
                  />
                }
              />
            )}

            <GlassInput
              label="Phone Number"
              placeholder="+1 234 567 8900"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              icon={
                <Ionicons
                  name="call-outline"
                  size={20}
                  color="rgba(255,255,255,0.5)"
                />
              }
            />

            <GlassButton
              title={loading ? "Sending Code..." : "Continue"}
              onPress={handleContinue}
              loading={loading}
              disabled={!phone || (isNewUser && !name.trim())}
              size="lg"
              className="mt-2"
            />
          </GlassCard>

          <Text className="text-white/30 text-xs text-center px-4">
            By continuing, you agree to LockDigit's Terms of Service and Privacy
            Policy. We'll send a verification code to your phone number.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}
