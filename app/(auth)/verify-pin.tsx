import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/hooks/useAuth";
import { useFirebaseSessionReady } from "@/hooks/useFirebaseSessionReady";
import { getOrCreateDeviceFingerprint } from "@/lib/device-binding";
import * as SecureStoreHelper from "@/lib/secure-store";
import { ensureFirebaseSession, getFirebaseToken } from "@/lib/firebase";
import * as LocalAuthentication from "expo-local-authentication";

const MAX_PIN_ATTEMPTS = 5;

export default function VerifyPinScreen() {
  const router = useRouter();
  const { phone, pinLogin, pinLength: pinLengthParam } = useLocalSearchParams<{
    phone: string;
    pinLogin?: string;
    pinLength?: string;
  }>();
  const { ready: firebaseReady, hasUser: firebaseHasUser } = useFirebaseSessionReady();
  const { setAuthenticated, setPinCreated } = useAuthStore();
  const phoneValue = typeof phone === "string" ? phone : "";
  const isPhonePinLogin = pinLogin === "true";
  const phonePinLength = pinLengthParam === "6" ? 6 : 4;

  const user = useQuery(
    api.users.getMeForPin,
    !isPhonePinLogin && firebaseHasUser ? {} : "skip"
  );
  const verifyPin = useMutation(api.users.verifyPin);
  const verifyPinWithPhone = useMutation(api.users.verifyPinWithPhone);
  const completeTrustedDeviceLogin = useMutation(
    api.users.completeTrustedDeviceLogin
  );

  const [pin, setPin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricPrompting, setBiometricPrompting] = useState(false);
  const [phonePinSessionReady, setPhonePinSessionReady] = useState(!isPhonePinLogin);
  const [phonePinSessionError, setPhonePinSessionError] = useState<string | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const pinLength = isPhonePinLogin ? phonePinLength : user?.pinLength ?? 4;
  const biometricLabel = Platform.OS === "ios" ? "Face ID" : "Biometrics";
  const biometricActionLabel = Platform.OS === "ios" ? "Use Face ID" : "Use Biometrics";

  useEffect(() => {
    if (user?.pinLockedUntil && user.pinLockedUntil > Date.now()) {
      Alert.alert(
        "PIN Locked",
        "Too many failed attempts. Please verify with OTP to continue.",
        [
          {
            text: "Verify with OTP",
            onPress: () =>
              router.replace({
                pathname: "/(auth)/login",
                params: { resetPin: "true" },
              }),
          },
        ]
      );
    }
  }, [user?.pinLockedUntil, router]);

  useEffect(() => {
    if (!isPhonePinLogin) return;
    let active = true;
    setPhonePinSessionReady(false);
    setPhonePinSessionError(null);

    void (async () => {
      try {
        const deviceId = await getOrCreateDeviceFingerprint();
        if (!active) return;
        setCurrentDeviceId(deviceId);

        const firebaseUser = await ensureFirebaseSession();
        if (!active) return;
        if (!firebaseUser) {
          setPhonePinSessionError(
            "Unable to start secure session. Please verify with OTP."
          );
          return;
        }
        const token = await waitForFirebaseToken();
        if (!active) return;
        if (!token) {
          setPhonePinSessionError(
            "Unable to start secure session. Please verify with OTP."
          );
          return;
        }
        setPhonePinSessionReady(true);
      } catch (error) {
        if (__DEV__) {
          console.warn("Phone PIN session bootstrap failed:", error);
        }
        if (!active) return;
        setPhonePinSessionError(
          "Unable to start secure session. Please verify with OTP."
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [isPhonePinLogin]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const waitForFirebaseToken = async () => {
    for (let i = 0; i < 10; i += 1) {
      const token = await getFirebaseToken();
      if (token) return token;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    return null;
  };

  const completeSignIn = useCallback(async () => {
    if (!user) return false;
    const firebaseToken = await waitForFirebaseToken();
    if (!firebaseToken) {
      Alert.alert(
        "Session Error",
        "Could not establish an authenticated session. Please verify with OTP again.",
        [{ text: "Go to Login", onPress: () => router.replace("/(auth)/login") }]
      );
      return false;
    }

    await SecureStoreHelper.storeUserId(user._id);
    if (user.phone) {
      await SecureStoreHelper.storePhone(user.phone);
    } else if (phoneValue.length > 0) {
      await SecureStoreHelper.storePhone(phoneValue);
    }
    await SecureStoreHelper.storePinLength(String(pinLength));
    await SecureStoreHelper.setSetupComplete();
    setAuthenticated(user._id, user.phone || phoneValue || "");
    setPinCreated();
    router.replace("/(app)/(tabs)/home");
    return true;
  }, [phoneValue, pinLength, router, setAuthenticated, setPinCreated, user]);

  const completePhonePinSignIn = useCallback(
    async (session: { userId: string; pinLength?: number; phone?: string | null }) => {
      await SecureStoreHelper.storeUserId(session.userId);
      const resolvedPhone = session.phone || phoneValue;
      if (resolvedPhone) {
        await SecureStoreHelper.storePhone(resolvedPhone);
      }
      await SecureStoreHelper.storePinLength(
        String(session.pinLength === 6 ? 6 : phonePinLength)
      );
      await SecureStoreHelper.setSetupComplete();
      setAuthenticated(session.userId, resolvedPhone || "");
      setPinCreated();
      router.replace("/(app)/(tabs)/home");
    },
    [phonePinLength, phoneValue, router, setAuthenticated, setPinCreated]
  );

  useEffect(() => {
    let active = true;
    (async () => {
      const [enabled, hasHardware, isEnrolled] = await Promise.all([
        SecureStoreHelper.isFaceIdEnabled(),
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!active) return;
      setBiometricAvailable(enabled && hasHardware && isEnrolled);
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleBiometricSignIn = useCallback(async () => {
    if (!biometricAvailable || biometricPrompting) return;
    setBiometricPrompting(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:
          Platform.OS === "ios"
            ? "Verify with Face ID"
            : "Verify with biometrics",
        disableDeviceFallback: true,
        fallbackLabel: "Use PIN",
        cancelLabel: "Use PIN",
      });
      if (result.success) {
        if (isPhonePinLogin) {
          if (!currentDeviceId) {
            Alert.alert(
              "Verify with OTP",
              "This device needs OTP verification before biometric login."
            );
            return;
          }

          const trustedLoginResult = await completeTrustedDeviceLogin({
            phone: phoneValue,
            deviceId: currentDeviceId,
          });
          if (trustedLoginResult.success && trustedLoginResult.userId) {
            await completePhonePinSignIn({
              userId: trustedLoginResult.userId,
              pinLength: trustedLoginResult.pinLength,
              phone: trustedLoginResult.phone,
            });
            return;
          }

          Alert.alert(
            "Verification Required",
            "Please verify with OTP and create a new PIN for this device.",
            [
              {
                text: "Verify with OTP",
                onPress: () =>
                  router.replace({
                    pathname: "/(auth)/login",
                    params: { resetPin: "true" },
                  }),
              },
            ]
          );
          return;
        }

        await completeSignIn();
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("Biometric sign-in failed:", error);
      }
    } finally {
      setBiometricPrompting(false);
    }
  }, [
    biometricAvailable,
    biometricPrompting,
    completePhonePinSignIn,
    completeSignIn,
    completeTrustedDeviceLogin,
    currentDeviceId,
    isPhonePinLogin,
    phoneValue,
    router,
  ]);

  const handleDigitPress = async (digit: string) => {
    if (verifying) return;
    if (!isPhonePinLogin && (!user || !user.hasPin)) return;
    if (isPhonePinLogin && !phoneValue) return;
    if (pin.length >= pinLength) return;

    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === pinLength) {
      setVerifying(true);
      try {
        if (isPhonePinLogin) {
          if (!currentDeviceId) {
            Alert.alert(
              "Verify with OTP",
              "This device needs OTP verification before PIN login.",
              [
                {
                  text: "Verify with OTP",
                  onPress: () =>
                    router.replace({
                      pathname: "/(auth)/login",
                      params: { resetPin: "true" },
                    }),
                },
              ]
            );
            return;
          }

          const result = await verifyPinWithPhone({
            phone: phoneValue,
            pin: newPin,
            deviceId: currentDeviceId,
          });

          if (result.success && result.userId) {
            await completePhonePinSignIn({
              userId: result.userId,
              pinLength: result.pinLength,
              phone: result.phone,
            });
            return;
          }

          if (result.deviceMismatch) {
            Alert.alert(
              "Verification Required",
              "Please verify with OTP and create a new PIN for this device.",
              [
                {
                  text: "Verify with OTP",
                  onPress: () =>
                    router.replace({
                      pathname: "/(auth)/login",
                      params: { resetPin: "true" },
                    }),
                },
              ]
            );
            return;
          }

          shake();
          const attemptsFromServer =
            typeof result.attemptsMade === "number"
              ? result.attemptsMade
              : typeof result.maxAttempts === "number" &&
                  typeof result.remainingAttempts === "number"
                ? Math.max(0, result.maxAttempts - result.remainingAttempts)
                : undefined;
          const newAttempts = attemptsFromServer ?? attempts + 1;
          setAttempts(newAttempts);
          setTimeout(() => setPin(""), 300);

          if (result.locked || newAttempts >= MAX_PIN_ATTEMPTS) {
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
          return;
        }

        const result = await verifyPin({ pin: newPin });
        if (result.success) {
          const signedIn = await completeSignIn();
          if (!signedIn) {
            setPin("");
          }
        } else {
          shake();
          const attemptsFromServer =
            typeof result.attemptsMade === "number"
              ? result.attemptsMade
              : typeof result.maxAttempts === "number" &&
                  typeof result.remainingAttempts === "number"
                ? Math.max(0, result.maxAttempts - result.remainingAttempts)
                : undefined;
          const newAttempts = attemptsFromServer ?? attempts + 1;
          setAttempts(newAttempts);
          setTimeout(() => setPin(""), 300);

          if (result.locked) {
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
          } else if (newAttempts >= MAX_PIN_ATTEMPTS) {
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

  if (!phoneValue) {
    return (
      <View className="flex-1 bg-ios-bg items-center justify-center px-6">
        <Text className="text-ios-grey4 text-center">
          Phone number missing. Please start login again.
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

  if (isPhonePinLogin && !phonePinSessionReady) {
    return (
      <View className="flex-1 bg-ios-bg items-center justify-center px-6">
        <ActivityIndicator size="large" color="#0A84FF" />
        <Text className="text-ios-grey4 mt-4 text-center">
          {phonePinSessionError || "Preparing secure session..."}
        </Text>
        {phonePinSessionError ? (
          <TouchableOpacity
            onPress={() =>
              router.replace({
                pathname: "/(auth)/login",
                params: { resetPin: "true" },
              })
            }
            className="mt-4"
          >
            <Text className="text-primary text-sm font-medium">Verify with OTP</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  if (!isPhonePinLogin && !firebaseReady) {
    return (
      <View className="flex-1 bg-ios-bg items-center justify-center">
        <ActivityIndicator size="large" color="#0A84FF" />
        <Text className="text-ios-grey4 mt-4">Loading session...</Text>
      </View>
    );
  }

  if (!isPhonePinLogin && !firebaseHasUser) {
    return (
      <View className="flex-1 bg-ios-bg items-center justify-center px-6">
        <Text className="text-ios-grey4 text-center">
          No authenticated session found. Verify with OTP to continue.
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

  if (!isPhonePinLogin && user === undefined) {
    return (
      <View className="flex-1 bg-ios-bg items-center justify-center">
        <ActivityIndicator size="large" color="#0A84FF" />
        <Text className="text-ios-grey4 mt-4">Loading account...</Text>
      </View>
    );
  }

  if (!isPhonePinLogin && !user) {
    return (
      <View className="flex-1 bg-ios-bg items-center justify-center px-6">
        <Text className="text-ios-grey4 text-center">
          No authenticated session found. Verify with OTP to continue.
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
            <Text className="text-ios-dark text-2xl font-bold">
              Welcome Back
            </Text>
            <Text className="text-ios-grey4 text-sm mt-2 text-center">
              Enter your PIN to continue
            </Text>
            <Text className="text-primary text-xs mt-1">{phoneValue}</Text>
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

          {biometricAvailable ? (
            <TouchableOpacity
              onPress={() => void handleBiometricSignIn()}
              className="items-center mt-2"
              disabled={biometricPrompting}
            >
              <Text className="text-primary text-sm font-medium">
                {biometricPrompting
                  ? `${biometricLabel} in progress...`
                  : biometricActionLabel}
              </Text>
            </TouchableOpacity>
          ) : null}

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
