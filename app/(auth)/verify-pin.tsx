import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { hashPin } from "@/lib/pin-manager";
import { useAuthStore } from "@/hooks/useAuth";
import * as SecureStoreHelper from "@/lib/secure-store";

export default function VerifyPinScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { setAuthenticated, setPinCreated } = useAuthStore();

  const user = useQuery(
    api.users.getByPhone,
    phone ? { phone } : "skip"
  );

  const [pin, setPin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const pinLength = user?.pinLength ?? 4;

  useEffect(() => {
    if (user === null) {
      Alert.alert(
        "Not Registered",
        "This number is not registered. Please sign up.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [user]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleDigitPress = async (digit: string) => {
    if (!user || verifying) return;
    if (pin.length >= pinLength) return;

    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === pinLength) {
      setVerifying(true);
      try {
        const hash = await hashPin(newPin, user.pinSalt!);
        if (hash === user.pinHash) {
          await SecureStoreHelper.storePinHash(user.pinHash!, user.pinSalt!);
          await SecureStoreHelper.storeUserId(user._id);
          await SecureStoreHelper.storePhone(phone!);
          await SecureStoreHelper.storePinLength(String(pinLength));
          await SecureStoreHelper.setSetupComplete();
          setAuthenticated(user._id, phone!);
          setPinCreated();
          router.replace("/(app)/(tabs)/home");
        } else {
          shake();
          setAttempts((prev) => prev + 1);
          setTimeout(() => setPin(""), 300);

          if (attempts >= 4) {
            Alert.alert(
              "Too Many Attempts",
              "Please verify your identity with OTP.",
              [{
                text: "Verify with OTP",
                onPress: () => router.replace({
                  pathname: "/(auth)/login",
                  params: { resetPin: "true" },
                }),
              }]
            );
          }
        }
      } catch {
        shake();
        setTimeout(() => setPin(""), 300);
      } finally {
        setVerifying(false);
      }
    }
  };

  const handleBackspace = () => {
    if (!verifying) setPin(pin.slice(0, -1));
  };

  if (user === undefined) {
    return (
      <View className="flex-1 bg-ios-bg items-center justify-center">
        <ActivityIndicator size="large" color="#0A84FF" />
        <Text className="text-ios-grey4 mt-4">Loading account...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1">
        <View className="flex-1 justify-center">
          {/* Header */}
          <View className="items-center mb-10 px-6">
            <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
              <Ionicons name="lock-closed" size={36} color="#0A84FF" />
            </View>
            <Text className="text-ios-dark text-2xl font-bold">
              Welcome Back
            </Text>
            <Text className="text-ios-grey4 text-sm mt-2 text-center">
              Enter your PIN to continue
            </Text>
            <Text className="text-primary text-xs mt-1">{phone}</Text>
          </View>

          {/* PIN dots */}
          <Animated.View
            className="flex-row justify-center mb-10"
            style={{ transform: [{ translateX: shakeAnim }] }}
          >
            {Array.from({ length: pinLength }).map((_, i) => (
              <View
                key={i}
                className={`w-4 h-4 rounded-full mx-2.5 ${
                  i < pin.length ? "bg-primary" : "bg-ios-border"
                }`}
              />
            ))}
          </Animated.View>

          {/* Keypad */}
          <View className="px-10">
            {[
              ["1", "2", "3"],
              ["4", "5", "6"],
              ["7", "8", "9"],
              ["", "0", "back"],
            ].map((row, rowIndex) => (
              <View key={rowIndex} className="flex-row justify-around mb-4">
                {row.map((key) => {
                  if (key === "") {
                    return <View key="empty" className="w-20 h-16" />;
                  }
                  if (key === "back") {
                    return (
                      <TouchableOpacity
                        key="back"
                        onPress={handleBackspace}
                        className="w-20 h-16 items-center justify-center"
                      >
                        <Ionicons name="backspace-outline" size={28} color="#1C1C1E" />
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => handleDigitPress(key)}
                      className="w-20 h-16 items-center justify-center rounded-2xl bg-white border border-ios-border"
                      style={styles.keyShadow}
                      activeOpacity={0.6}
                    >
                      <Text className="text-ios-dark text-2xl font-semibold">{key}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Use OTP instead */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="items-center mt-6"
          >
            <Text className="text-primary text-sm">Use OTP instead</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  keyShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
});
