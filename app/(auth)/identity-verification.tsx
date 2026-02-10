import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function IdentityVerificationScreen() {
  const router = useRouter();

  const submitRequest = useMutation(api.identityRequests.submitManualRequest);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [countryCode, setCountryCode] = useState("+1");

  const emailError = useMemo(() => {
    if (!email.trim()) return "";
    const basicEmailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    return basicEmailRegex.test(email.trim()) ? "" : "Enter a valid email address.";
  }, [email]);

  const mobileError = useMemo(() => {
    const digits = mobile.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length < 7) return "Enter a valid mobile number.";
    return "";
  }, [mobile]);

  const canSubmit =
    !!fullName.trim() &&
    !!mobile.trim() &&
    !mobileError &&
    !!idNumber.trim() &&
    acceptedTerms &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const normalizedPhone = mobile.replace(/\D/g, "");

      await submitRequest({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        phone: `${countryCode}${normalizedPhone}`,
        idNumber: idNumber.trim(),
        countryCode,
      });

      Alert.alert(
        "Request Submitted",
        "Your details have been submitted for identity verification. We'll notify you once your account is ready.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(auth)/login"),
          },
        ]
      );
    } finally {
      setSubmitting(false);
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
            <Text className="text-xl font-bold text-ios-dark">Sign Up</Text>
          </View>

          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Progress bar mimic */}
            <View className="mt-2 mb-6">
              <View className="h-1 rounded-full bg-ios-borderLight overflow-hidden">
                <View className="h-1 w-1/3 bg-primary rounded-full" />
              </View>
            </View>

            {/* Title */}
            <View className="mb-6">
              <Text className="text-2xl font-bold text-ios-dark mb-1">
                Create Account
              </Text>
              <Text className="text-ios-grey4 text-sm">
                Enter your details to verify your identity.
              </Text>
            </View>

            {/* Form Card */}
            <View
              className="bg-white rounded-3xl border border-ios-border p-5"
              style={styles.cardShadow}
            >
              {/* Full Name */}
              <View className="mb-4">
                <Text className="text-ios-grey4 text-xs mb-1">Full Name</Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Full Name"
                  className="bg-ios-bg rounded-2xl px-4 py-3 text-ios-dark text-base"
                  placeholderTextColor="#A1A1AA"
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              {/* Email */}
              <View className="mb-4">
                <Text className="text-ios-grey4 text-xs mb-1">Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  className="bg-ios-bg rounded-2xl px-4 py-3 text-ios-dark text-base"
                  placeholderTextColor="#A1A1AA"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                />
                {!!emailError && (
                  <Text className="text-xs text-danger mt-1">{emailError}</Text>
                )}
              </View>

              {/* Mobile Number */}
              <View className="mb-4">
                <Text className="text-ios-grey4 text-xs mb-1">
                  Mobile Number
                </Text>
                <View className="flex-row items-center bg-ios-bg rounded-2xl px-3 py-1">
                  <TouchableOpacity
                    className="flex-row items-center mr-2 py-2 px-1"
                    activeOpacity={0.7}
                    onPress={() => setCountryCode(countryCode === "+1" ? "+91" : "+1")}
                  >
                    <Text className="text-ios-dark text-base">{countryCode}</Text>
                    <Ionicons
                      name="chevron-down"
                      size={14}
                      color="#A1A1AA"
                      style={{ marginLeft: 4 }}
                    />
                  </TouchableOpacity>
                  <View className="w-px h-5 bg-ios-borderLight mr-2" />
                  <TextInput
                    value={mobile}
                    onChangeText={setMobile}
                    placeholder="Mobile Number"
                    className="flex-1 text-ios-dark text-base py-2"
                    placeholderTextColor="#A1A1AA"
                    keyboardType="phone-pad"
                    returnKeyType="next"
                  />
                </View>
                {!!mobileError && (
                  <Text className="text-xs text-danger mt-1">{mobileError}</Text>
                )}
              </View>

              {/* ID Number */}
              <View className="mb-6">
                <Text className="text-ios-grey4 text-xs mb-1">
                  ID Number (United States)
                </Text>
                <TextInput
                  value={idNumber}
                  onChangeText={setIdNumber}
                  placeholder="Enter your ID number"
                  className="bg-ios-bg rounded-2xl px-4 py-3 text-ios-dark text-base"
                  placeholderTextColor="#A1A1AA"
                  autoCapitalize="characters"
                  returnKeyType="done"
                />
              </View>

              {/* Terms checkbox */}
              <TouchableOpacity
                className="flex-row items-center mb-6"
                activeOpacity={0.8}
                onPress={() => setAcceptedTerms((v) => !v)}
              >
                <View
                  className={`w-5 h-5 rounded-full border mr-3 items-center justify-center ${
                    acceptedTerms ? "bg-primary border-primary" : "border-ios-border"
                  }`}
                >
                  {acceptedTerms && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text className="text-ios-grey4 text-xs flex-1">
                  I agree to the{" "}
                  <Text className="text-primary">Terms of Service</Text> and{" "}
                  <Text className="text-primary">Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              {/* Submit button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!canSubmit}
                className="rounded-2xl py-4 items-center justify-center"
                style={[
                  {
                    backgroundColor: canSubmit ? "#0A84FF" : "#E5E5EA",
                  },
                  styles.buttonShadow,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  className={`text-base font-semibold ${
                    canSubmit ? "text-white" : "text-ios-grey4"
                  }`}
                >
                  {submitting ? "Submitting..." : "Verify Identity"}
                </Text>
              </TouchableOpacity>
            </View>
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
  buttonShadow: {
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 3,
  },
});
