import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ScreenWrapper } from "@/components/common";
import { GlassCard } from "@/components/glass";
import { createPin, isPinValid } from "@/lib/pin-manager";
import { getOrCreateDeviceFingerprint } from "@/lib/device-binding";
import * as SecureStoreHelper from "@/lib/secure-store";
import { useAuthStore } from "@/hooks/useAuth";

type PinLength = 4 | 6;

export default function CreatePinScreen() {
  const router = useRouter();
  const { phone, name, isNewUser } = useLocalSearchParams<{
    phone: string;
    name: string;
    isNewUser: string;
  }>();

  const createUser = useMutation(api.users.createUser);

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
          // Validate the PIN
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
    setLoading(true);
    try {
      // Hash and store PIN locally
      const { hash, salt } = await createPin(finalPin);

      // Get device fingerprint
      const deviceId = await getOrCreateDeviceFingerprint();

      // Create user in Convex if new
      if (isNewUser === "true" && phone) {
        const userId = await createUser({
          name: name || "User",
          phone,
          pinHash: hash,
          pinSalt: salt,
          deviceId,
        });

        await SecureStoreHelper.storeUserId(userId);
        await SecureStoreHelper.setSetupComplete();
        setAuthenticated(userId, phone);
      } else {
        // Existing user - just store locally
        await SecureStoreHelper.setSetupComplete();
      }

      setPinCreated();

      // Navigate to home
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
          className={`w-4 h-4 rounded-full mx-2 ${
            i < currentPin.length ? "bg-primary" : "bg-white/20"
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
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={key}
                onPress={() => handleDigitPress(key)}
                className="w-20 h-16 items-center justify-center rounded-2xl bg-white/5"
                activeOpacity={0.6}
              >
                <Text className="text-white text-2xl font-semibold">
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
      <ScreenWrapper>
        <View className="flex-1 px-6 justify-center">
          <View className="items-center mb-10">
            <View className="w-20 h-20 rounded-full bg-primary/20 items-center justify-center mb-4">
              <Ionicons name="lock-closed" size={40} color="#6C63FF" />
            </View>
            <Text className="text-white text-2xl font-bold">
              Create Your PIN
            </Text>
            <Text className="text-white/50 text-base mt-2 text-center">
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
              <GlassCard>
                <View className="flex-row items-center">
                  <View className="w-14 h-14 rounded-xl bg-primary/20 items-center justify-center mr-4">
                    <Text className="text-primary text-xl font-bold">4</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold text-base">
                      4-Digit PIN
                    </Text>
                    <Text className="text-white/50 text-sm mt-0.5">
                      Quick access, good security
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="rgba(255,255,255,0.3)"
                  />
                </View>
              </GlassCard>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setPinLength(6);
                setStep("enter");
              }}
            >
              <GlassCard>
                <View className="flex-row items-center">
                  <View className="w-14 h-14 rounded-xl bg-secondary/20 items-center justify-center mr-4">
                    <Text className="text-secondary text-xl font-bold">6</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold text-base">
                      6-Digit PIN
                    </Text>
                    <Text className="text-white/50 text-sm mt-0.5">
                      Maximum security, recommended
                    </Text>
                  </View>
                  <View className="bg-primary/20 px-2 py-1 rounded-full mr-2">
                    <Text className="text-primary text-xs font-medium">
                      Recommended
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="rgba(255,255,255,0.3)"
                  />
                </View>
              </GlassCard>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View className="flex-1 justify-center">
        {/* Header */}
        <View className="items-center mb-8 px-6">
          <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center mb-4">
            <Ionicons
              name={step === "confirm" ? "checkmark-circle" : "lock-closed"}
              size={32}
              color="#6C63FF"
            />
          </View>
          <Text className="text-white text-xl font-bold">
            {step === "enter" ? "Enter Your PIN" : "Confirm Your PIN"}
          </Text>
          <Text className="text-white/50 text-sm mt-2">
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
    </ScreenWrapper>
  );
}
