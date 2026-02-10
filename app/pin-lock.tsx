import React, { useState, useRef } from "react";
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
import { validatePin } from "@/lib/pin-manager";
import { useAuthStore } from "@/hooks/useAuth";
import * as SecureStoreHelper from "@/lib/secure-store";

export default function PinLockScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const { setPinVerified } = useAuthStore();

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
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4 || newPin.length === 6) {
      const isValid = await validatePin(newPin);
      if (isValid) {
        setPinVerified(true);
        router.replace("/(app)/(tabs)/home");
      } else if (newPin.length === 6) {
        shake();
        setAttempts(attempts + 1);
        setTimeout(() => setPin(""), 300);

        if (attempts >= 4) {
          Alert.alert(
            "Too Many Attempts",
            "For security, please verify your identity again.",
            [
              {
                text: "Verify Identity",
                onPress: async () => {
                  await SecureStoreHelper.clearAll();
                  router.replace("/(auth)/login");
                },
              },
            ]
          );
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

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
          </View>

          {/* PIN dots */}
          <Animated.View
            className="flex-row justify-center mb-10"
            style={{ transform: [{ translateX: shakeAnim }] }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
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
                "You'll need to verify your phone number again to reset your PIN.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Reset",
                    onPress: async () => {
                      await SecureStoreHelper.clearAll();
                      router.replace("/(auth)/login");
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
