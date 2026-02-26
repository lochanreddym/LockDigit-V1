import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/hooks/useAuth";
import * as SecureStoreHelper from "@/lib/secure-store";
import { useFirebaseSessionReady } from "@/hooks/useFirebaseSessionReady";

const MAX_APP_PIN_ATTEMPTS = 5;

export default function PinLockScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [pinError, setPinError] = useState("");
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const { setPinVerified } = useAuthStore();
  const firebaseSessionReady = useFirebaseSessionReady();
  const user = useQuery(api.users.getMeForPin, firebaseSessionReady ? {} : "skip");
  const verifyPin = useMutation(api.users.verifyPin);
  const pinLength = user?.pinLength ?? 6;

  useEffect(() => {
    if (user?.pinLockedUntil && user.pinLockedUntil > Date.now()) {
      Alert.alert(
        "PIN Locked",
        "Too many failed attempts. Please verify your identity with OTP.",
        [
          {
            text: "Verify Identity",
            onPress: async () => {
              await SecureStoreHelper.clearAll();
              router.replace({
                pathname: "/(auth)/login",
                params: { resetPin: "true" },
              });
            },
          },
        ]
      );
    }
  }, [user?.pinLockedUntil, router]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 15,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -15,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleDigitPress = async (digit: string) => {
    setPinError("");
    if (!user || !user.hasPin) return;
    if (pin.length >= pinLength) return;
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === pinLength) {
      try {
        const result = await verifyPin({ pin: newPin });
        if (result.success) {
          setPinVerified(true);
          router.replace("/(app)/(tabs)/home");
          return;
        }

        shake();
        const attemptsMade =
          typeof result.attemptsMade === "number"
            ? result.attemptsMade
            : attempts + 1;
        const remainingAttempts =
          typeof result.remainingAttempts === "number"
            ? result.remainingAttempts
            : Math.max(0, MAX_APP_PIN_ATTEMPTS - attemptsMade);
        setAttempts(attemptsMade);
        setTimeout(() => setPin(""), 300);

        if (result.locked || remainingAttempts <= 0) {
          Alert.alert(
            "Too Many Attempts",
            "For security, please verify your identity again.",
            [
              {
                text: "Verify Identity",
                onPress: async () => {
                  await SecureStoreHelper.clearAll();
                  router.replace({
                    pathname: "/(auth)/login",
                    params: { resetPin: "true" },
                  });
                },
              },
            ]
          );
        }
      } catch (err) {
        console.error("PIN verification request failed", err);
        setPinError("Verification service unavailable. Please try again.");
        shake();
        setTimeout(() => setPin(""), 300);
      }
    }
  };

  const handleBackspace = () => {
    setPinError("");
    setPin(pin.slice(0, -1));
  };

  if (!firebaseSessionReady || user === undefined) {
    return (
      <View className="flex-1 bg-ios-bg items-center justify-center">
        <Text className="text-ios-grey4">Loading secure session...</Text>
      </View>
    );
  }

  if (!user || !user.hasPin) {
    return (
      <View className="flex-1 bg-ios-bg items-center justify-center px-6">
        <Text className="text-ios-grey4 text-center">
          Session expired. Please verify with OTP again.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
          className="mt-4"
        >
          <Text className="text-primary text-sm font-medium">Go to Login</Text>
        </TouchableOpacity>
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
            <Text className="text-ios-dark text-2xl font-bold">Enter PIN</Text>
            <Text className="text-ios-grey4 text-sm mt-2">
              Enter your PIN to unlock LockDigit
            </Text>
            {pinError ? (
              <Text className="text-red-500 text-sm mt-2 text-center">
                {pinError}
              </Text>
            ) : null}
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
                        <Ionicons
                          name="backspace-outline"
                          size={28}
                          color="#1C1C1E"
                        />
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
                      <Text className="text-ios-dark text-2xl font-semibold">
                        {key}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Forgot PIN */}
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                "Forgot PIN?",
                "Enter your registered number and verify with OTP to set a new PIN.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Reset",
                    onPress: async () => {
                      await SecureStoreHelper.clearAll();
                      useAuthStore.getState().logout();
                      router.replace({
                        pathname: "/(auth)/login",
                        params: { resetPin: "true" },
                      });
                    },
                    style: "destructive",
                  },
                ]
              );
            }}
            className="items-center mt-6"
          >
            <Text className="text-primary text-sm">Forgot PIN?</Text>
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
