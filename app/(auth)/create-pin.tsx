import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { createPin, isPinValid } from "@/lib/pin-manager";
import { getOrCreateDeviceFingerprint } from "@/lib/device-binding";
import * as SecureStoreHelper from "@/lib/secure-store";
import { useAuthStore } from "@/hooks/useAuth";
import { LinearGradient } from "expo-linear-gradient";

type PinLength = 4 | 6;

export default function CreatePinScreen() {
  const router = useRouter();
  const { phone, name, isNewUser, resetPin } = useLocalSearchParams<{
    phone: string;
    name: string;
    isNewUser: string;
    resetPin?: string;
  }>();

  const createUser = useMutation(api.users.createUser);
  const updatePin = useMutation(api.users.updatePin);
  const existingUser = useQuery(
    api.users.getByPhone,
    resetPin === "true" && phone ? { phone } : "skip"
  );

  const [pinLength, setPinLength] = useState<PinLength>(4);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"choose_length" | "enter" | "confirm">(
    "choose_length"
  );
  const [loading, setLoading] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const { setAuthenticated, setPinCreated } = useAuthStore();

  const shake = () => {
    Animated.sequence([
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
        toValue: 10,
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

  const handleDigitPress = (digit: string) => {
    if (step === "enter") {
      if (pin.length < pinLength) {
        const newPin = pin + digit;
        setPin(newPin);
        if (newPin.length === pinLength) {
          const validation = isPinValid(newPin);
          if (!validation.valid) {
            shake();
            setTimeout(() => {
              Alert.alert("Weak PIN", validation.error!);
              setPin("");
            }, 200);
          } else {
            setTimeout(() => setStep("confirm"), 200);
          }
        }
      }
    } else if (step === "confirm") {
      if (confirmPin.length < pinLength) {
        const newConfirm = confirmPin + digit;
        setConfirmPin(newConfirm);
        if (newConfirm.length === pinLength) {
          if (newConfirm !== pin) {
            shake();
            setTimeout(() => {
              Alert.alert("PINs Don't Match", "Please try again.");
              setConfirmPin("");
              setStep("enter");
              setPin("");
            }, 200);
          } else {
            handleCreatePin(newConfirm);
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    if (step === "enter") {
      setPin(pin.slice(0, -1));
    } else if (step === "confirm") {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const handleCreatePin = async (finalPin: string) => {
    if (resetPin === "true") {
      if (existingUser === undefined) {
        Alert.alert("Please wait", "Verifying your account…");
        return;
      }
      if (existingUser === null || !phone) {
        Alert.alert(
          "Not Registered",
          "This number is not registered. Please sign up first."
        );
        return;
      }
    }

    setLoading(true);
    try {
      const { hash, salt } = await createPin(finalPin);
      await SecureStoreHelper.storePinLength(String(pinLength));

      if (resetPin === "true" && existingUser && phone) {
        await updatePin({
          userId: existingUser._id,
          pinHash: hash,
          pinSalt: salt,
          pinLength,
        });
        await SecureStoreHelper.storeUserId(existingUser._id);
        await SecureStoreHelper.storePhone(phone);
        await SecureStoreHelper.setSetupComplete();
        setAuthenticated(existingUser._id, phone);
      } else if (isNewUser === "true" && phone) {
        const deviceId = await getOrCreateDeviceFingerprint();
        const userId = await createUser({
          name: name || "User",
          phone,
          pinHash: hash,
          pinSalt: salt,
          pinLength,
          deviceId,
        });

        await SecureStoreHelper.storeUserId(userId);
        await SecureStoreHelper.storePhone(phone);
        await SecureStoreHelper.setSetupComplete();
        setAuthenticated(userId, phone);
      } else {
        await SecureStoreHelper.setSetupComplete();
      }

      setPinCreated();
      router.replace("/(app)/(tabs)/home");
    } catch (error: any) {
      console.error("PIN creation failed:", error);
      Alert.alert(
        "Setup Failed",
        error?.message || "Failed to create PIN. Please try again."
      );
      setPin("");
      setConfirmPin("");
      setStep("enter");
    } finally {
      setLoading(false);
    }
  };

  const currentPin = step === "confirm" ? confirmPin : pin;

  const renderPinDots = () => (
    <Animated.View
      className="flex-row justify-center mb-8"
      style={{ transform: [{ translateX: shakeAnim }] }}
    >
      {Array.from({ length: pinLength }).map((_, i) => (
        <View
          key={i}
          className={`w-4 h-4 rounded-full mx-2.5 ${
            i < currentPin.length ? "bg-primary" : "bg-ios-border"
          }`}
        />
      ))}
    </Animated.View>
  );

  const renderKeypad = () => (
    <View className="px-8">
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
  );

  if (step === "choose_length") {
    return (
      <View className="flex-1 bg-ios-bg">
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="flex-row items-center px-5 py-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-3 p-1"
            >
              <Ionicons name="chevron-back" size={24} color="#0A84FF" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-ios-dark">
              {resetPin === "true" ? "Create new PIN" : "Create PIN"}
            </Text>
          </View>

          {resetPin === "true" && existingUser === null && (
            <View className="mx-5 mt-2 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <Text className="text-red-600 text-sm text-center">
                This number is not registered. Go back and use your registered number.
              </Text>
            </View>
          )}

          <View className="flex-1 px-5 justify-center">
            <View className="items-center mb-10">
              <LinearGradient
                colors={["#0A84FF", "#5E5CE6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
              >
                <Ionicons name="lock-closed" size={40} color="#FFFFFF" />
              </LinearGradient>
              <Text className="text-ios-dark text-2xl font-bold">
                Create Your PIN
              </Text>
              <Text className="text-ios-grey4 text-base mt-2 text-center">
                Choose a PIN length for quick and secure access
              </Text>
            </View>

            <View className="gap-4">
              <TouchableOpacity
                onPress={() => {
                  setPinLength(4);
                  setStep("enter");
                }}
              >
                <View
                  className="bg-white rounded-3xl border border-ios-border p-5"
                  style={styles.cardShadow}
                >
                  <View className="flex-row items-center">
                    <View className="w-14 h-14 rounded-xl bg-primary/10 items-center justify-center mr-4">
                      <Text className="text-primary text-xl font-bold">4</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-ios-dark font-semibold text-base">
                        4-Digit PIN
                      </Text>
                      <Text className="text-ios-grey4 text-sm mt-0.5">
                        Quick access, good security
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#C7C7CC"
                    />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setPinLength(6);
                  setStep("enter");
                }}
              >
                <View
                  className="bg-white rounded-3xl border border-primary p-5"
                  style={styles.cardShadow}
                >
                  <View className="flex-row items-center">
                    <View className="w-14 h-14 rounded-xl bg-primary/10 items-center justify-center mr-4">
                      <Text className="text-primary text-xl font-bold">6</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-ios-dark font-semibold text-base">
                        6-Digit PIN
                      </Text>
                      <Text className="text-ios-grey4 text-sm mt-0.5">
                        Maximum security, recommended
                      </Text>
                    </View>
                    <View className="bg-primary/10 px-2 py-1 rounded-full mr-2">
                      <Text className="text-primary text-xs font-medium">
                        Recommended
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#C7C7CC"
                    />
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Security Tips */}
            <View
              className="bg-white rounded-3xl border border-ios-border p-5 mt-6"
              style={styles.cardShadow}
            >
              <View className="flex-row items-center mb-3">
                <Ionicons name="shield-checkmark" size={20} color="#0A84FF" />
                <Text className="text-ios-dark font-semibold text-sm ml-2">
                  Security Tips
                </Text>
              </View>
              <Text className="text-ios-grey4 text-sm leading-5">
                • Don't use sequential numbers (1234){"\n"}
                • Avoid repeated digits (1111){"\n"}
                • Don't share your PIN with anyone{"\n"}
                • Use a unique PIN not used elsewhere
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center px-5 py-3">
          <TouchableOpacity
            onPress={() => {
              if (step === "confirm") {
                setConfirmPin("");
                setStep("enter");
                setPin("");
              } else {
                setPin("");
                setStep("choose_length");
              }
            }}
            className="mr-3 p-1"
          >
            <Ionicons name="chevron-back" size={24} color="#0A84FF" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-ios-dark">
            {step === "enter" ? "Enter PIN" : "Confirm PIN"}
          </Text>
        </View>

        <View className="flex-1 justify-center">
          {/* Header */}
          <View className="items-center mb-8 px-6">
            <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
              <Ionicons
                name={step === "confirm" ? "checkmark-circle" : "lock-closed"}
                size={32}
                color="#0A84FF"
              />
            </View>
            <Text className="text-ios-dark text-xl font-bold">
              {step === "enter" ? "Enter Your PIN" : "Confirm Your PIN"}
            </Text>
            <Text className="text-ios-grey4 text-sm mt-2">
              {step === "enter"
                ? `Create a ${pinLength}-digit PIN`
                : "Re-enter your PIN to confirm"}
            </Text>
          </View>

          {/* PIN dots */}
          {renderPinDots()}

          {/* Keypad */}
          {renderKeypad()}

          {/* Change PIN length */}
          {step === "enter" && (
            <TouchableOpacity
              onPress={() => {
                setPin("");
                setStep("choose_length");
              }}
              className="items-center mt-4"
            >
              <Text className="text-primary text-sm">Change PIN length</Text>
            </TouchableOpacity>
          )}
        </View>
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
  keyShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
});
