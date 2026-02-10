import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  StyleSheet,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { sendOTP } from "@/lib/firebase";

const isIOSSimulator =
  Platform.OS === "ios" && !Constants.isDevice;

// Max digits allowed per country (no spaces/dashes; digits only)
const COUNTRY_MAX_DIGITS: Record<string, number> = {
  "+1": 10,   // USA
  "+91": 10,  // India
};
const DEFAULT_MAX_DIGITS = 15;

const SUPPORTED_COUNTRY_CODES = ["+1", "+91"] as const;

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [loading, setLoading] = useState(false);

  const maxDigits = COUNTRY_MAX_DIGITS[countryCode] ?? DEFAULT_MAX_DIGITS;

  const setPhoneWithLimit = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, maxDigits);
    setPhone(digits);
  };

  const cycleCountryCode = () => {
    const idx = SUPPORTED_COUNTRY_CODES.indexOf(countryCode as typeof SUPPORTED_COUNTRY_CODES[number]);
    const next = SUPPORTED_COUNTRY_CODES[(idx + 1) % SUPPORTED_COUNTRY_CODES.length];
    setCountryCode(next);
    // Trim phone if new country allows fewer digits
    const newMax = COUNTRY_MAX_DIGITS[next] ?? DEFAULT_MAX_DIGITS;
    setPhone((p) => p.replace(/\D/g, "").slice(0, newMax));
  };

  const isPhoneValid = () => {
    const digits = phone.replace(/\D/g, "");
    const required = COUNTRY_MAX_DIGITS[countryCode];
    if (required !== undefined) return digits.length === required;
    return digits.length >= 7;
  };

  const handleContinue = async () => {
    if (!phone || !isPhoneValid()) {
      const required = COUNTRY_MAX_DIGITS[countryCode];
      const msg = required !== undefined
        ? `Please enter a ${required}-digit ${countryCode === "+91" ? "Indian" : "US"} phone number.`
        : "Please enter a valid phone number.";
      Alert.alert("Invalid Phone", msg);
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = `${countryCode}${phone}`;

      if (isIOSSimulator) {
        // Firebase Phone Auth can crash on iOS Simulator (reCAPTCHA/APNs). Skip native call and continue for testing.
        router.push({
          pathname: "/(auth)/verify",
          params: {
            phone: formattedPhone,
            name: "",
            isNewUser: "true",
            simulatorTest: "true",
          },
        });
        setLoading(false);
        return;
      }

      await sendOTP(formattedPhone);
      router.push({
        pathname: "/(auth)/verify",
        params: {
          phone: formattedPhone,
          name: "",
          isNewUser: "true",
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
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" bounces={false}>
        {/* Hero Section with Gradient */}
        <LinearGradient
          colors={["#0A84FF", "#5E5CE6", "#7C3AED"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Decorative shapes */}
          <View className="absolute top-10 left-10 w-32 h-32 rounded-3xl bg-white/10 rotate-12" />
          <View className="absolute top-32 right-16 w-24 h-24 rounded-2xl bg-white/5 -rotate-12" />
          <View className="absolute bottom-16 left-1/4 w-40 h-40 rounded-3xl bg-white/10 rotate-45" />

          <SafeAreaView edges={["top"]}>
            <View className="items-center pt-8 pb-12 px-5">
              {/* Logo */}
              <Image
                source={require("@/assets/images/app-logo.png")}
                style={styles.appIcon}
                resizeMode="contain"
              />

              <Text className="text-white text-3xl font-bold text-center">
                LockDigit
              </Text>
              <Text className="text-white/80 text-base text-center mt-1">
                Secure way to Store and Verify ID.
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* Content Section */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View className="bg-ios-bgAlt px-5 py-8 items-center">
            <Text className="text-ios-darkAlt text-2xl font-bold mb-2 text-center">
              Login or Create Account
            </Text>
            <Text className="text-ios-grey5 text-base mb-6 text-center">
              Enter your mobile number to proceed
            </Text>

            {/* Phone Input */}
            <View
              className="flex-row items-center bg-white rounded-2xl px-5 py-4 border border-ios-borderLight mb-4 w-full self-stretch"
              style={styles.inputShadow}
            >
              <TouchableOpacity
                className="flex-row items-center mr-3"
                onPress={cycleCountryCode}
                activeOpacity={0.7}
              >
                <Text className="text-ios-darkAlt text-base">{countryCode}</Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color="#86868B"
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
              <View className="w-px h-6 bg-ios-borderLight mr-3" />
              <TextInput
                placeholder={countryCode === "+91" ? "10-digit mobile number" : "10-digit phone number"}
                value={phone}
                onChangeText={setPhoneWithLimit}
                keyboardType="phone-pad"
                className="flex-1 text-ios-darkAlt text-base"
                placeholderTextColor="#86868B"
                maxLength={maxDigits}
              />
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              onPress={handleContinue}
              disabled={loading || !isPhoneValid()}
              className="bg-primary rounded-2xl py-4 mb-4 w-full self-stretch"
              style={[
                styles.buttonShadow,
                (!isPhoneValid() || loading) && { opacity: 0.4 },
              ]}
              activeOpacity={0.8}
            >
              <Text className="text-white text-center font-semibold text-base">
                {loading ? "Sending Code..." : "Continue"}
              </Text>
            </TouchableOpacity>

            {/* Terms */}
            <Text className="text-ios-grey5 text-xs text-center mb-8 w-full self-stretch">
              By continuing, I agree to{" "}
              <Text className="text-primary">Terms of Service</Text>
            </Text>

            {/* Divider */}
            <View className="flex-row items-center mb-8">
              <View className="flex-1 h-px bg-ios-borderLight" />
              <Text className="text-ios-grey5 text-xs mx-4">or</Text>
              <View className="flex-1 h-px bg-ios-borderLight" />
            </View>

            {/* Alternative */}
            <TouchableOpacity
              className="mb-8"
              onPress={() => router.push("/(auth)/identity-verification")}
              activeOpacity={0.7}
            >
              <Text className="text-primary text-center text-base">
                Try using Identity Verification
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View className="bg-ios-bgAlt px-5 pb-8">
          <Text className="text-ios-grey5 text-xs text-center">
            Facing Trouble -{" "}
            <Text className="text-primary">Need Help?</Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    overflow: "hidden",
  },
  appIcon: {
    width: 110,
    height: 110,
    borderRadius: 26,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  inputShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  buttonShadow: {
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
});
