import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import { generateSalt, hashPin, isPinValid } from "@/lib/pin-manager";

const CARD_BRANDS = ["Visa", "Mastercard", "RuPay", "Other"] as const;

export default function AddNewCardScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;

  const [step, setStep] = useState<"details" | "pin">("details");
  const [cardLast4, setCardLast4] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [brand, setBrand] = useState<string>("Visa");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  const addBankAccount = useMutation(api.payments.addBankAccount);

  const expiryValid =
    /^\d{2}$/.test(expiryMonth) &&
    parseInt(expiryMonth, 10) >= 1 &&
    parseInt(expiryMonth, 10) <= 12 &&
    /^\d{2}$/.test(expiryYear);
  const canSubmitDetails = /^\d{4}$/.test(cardLast4) && expiryValid;

  const handleNextToPin = () => {
    if (!canSubmitDetails) return;
    setStep("pin");
  };

  const handleSubmit = async () => {
    if (pin.length < 4 || pin !== confirmPin) {
      Alert.alert("Error", "PINs don't match or must be 4–6 digits.");
      return;
    }
    const validation = isPinValid(pin);
    if (!validation.valid) {
      Alert.alert("Weak PIN", validation.error);
      return;
    }
    if (!convexUserId) return;

    setLoading(true);
    try {
      const salt = await generateSalt();
      const paymentPinHash = await hashPin(pin, salt);
      await addBankAccount({
        userId: convexUserId,
        bankName: brand,
        accountLast4: cardLast4.trim(),
        isDefault: false,
        type: "card",
        expiryMonth: expiryMonth.trim(),
        expiryYear: expiryYear.trim(),
        brand,
        paymentPinHash,
        paymentPinSalt: salt,
      });
      Alert.alert("Done", "Card added. Use this PIN to view balance and pay.", [
        { text: "OK", onPress: () => router.replace("/(app)/my-wallet") },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not add card.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-row items-center px-5 py-3 border-b border-ios-border">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
              <Ionicons name="chevron-back" size={24} color="#0A84FF" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-ios-dark">
              {step === "details" ? "Add New Card" : "Set Payment PIN"}
            </Text>
          </View>

          <ScrollView className="flex-1 px-5 pt-6" keyboardShouldPersistTaps="handled">
            {step === "details" ? (
              <>
                <Text className="text-ios-grey4 text-sm mb-2">Card number (last 4 digits)</Text>
                <TextInput
                  value={cardLast4}
                  onChangeText={(t) => setCardLast4(t.replace(/\D/g, "").slice(0, 4))}
                  placeholder="4242"
                  keyboardType="number-pad"
                  maxLength={4}
                  className="bg-ios-bg border border-ios-border rounded-xl px-4 py-3 text-ios-dark mb-4"
                  placeholderTextColor="#8E8E93"
                />
                <Text className="text-ios-grey4 text-sm mb-2">Expiry (MM/YY)</Text>
                <View className="flex-row gap-3 mb-4">
                  <TextInput
                    value={expiryMonth}
                    onChangeText={(t) => setExpiryMonth(t.replace(/\D/g, "").slice(0, 2))}
                    placeholder="MM"
                    keyboardType="number-pad"
                    maxLength={2}
                    className="flex-1 bg-ios-bg border border-ios-border rounded-xl px-4 py-3 text-ios-dark"
                    placeholderTextColor="#8E8E93"
                  />
                  <TextInput
                    value={expiryYear}
                    onChangeText={(t) => setExpiryYear(t.replace(/\D/g, "").slice(0, 2))}
                    placeholder="YY"
                    keyboardType="number-pad"
                    maxLength={2}
                    className="flex-1 bg-ios-bg border border-ios-border rounded-xl px-4 py-3 text-ios-dark"
                    placeholderTextColor="#8E8E93"
                  />
                </View>
                <Text className="text-ios-grey4 text-sm mb-2">Brand</Text>
                <View className="flex-row flex-wrap gap-2 mb-6">
                  {CARD_BRANDS.map((b) => (
                    <TouchableOpacity
                      key={b}
                      onPress={() => setBrand(b)}
                      className="px-4 py-2.5 rounded-xl border"
                      style={{
                        borderColor: brand === b ? "#0A84FF" : "#E5E5EA",
                        backgroundColor: brand === b ? "#0A84FF10" : "#F2F2F7",
                      }}
                    >
                      <Text
                        className="font-medium"
                        style={{ color: brand === b ? "#0A84FF" : "#8E8E93" }}
                      >
                        {b}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={handleNextToPin}
                  disabled={!canSubmitDetails}
                  className="bg-primary rounded-xl py-3.5 items-center"
                  style={!canSubmitDetails && { opacity: 0.5 }}
                >
                  <Text className="text-white font-semibold">Continue</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text className="text-ios-grey4 text-sm mb-2">
                  Set a 4 or 6 digit PIN for this card (like UPI PIN).
                </Text>
                <Text className="text-ios-grey4 text-sm mb-2 mt-4">Payment PIN</Text>
                <TextInput
                  value={pin}
                  onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••"
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry
                  className="bg-ios-bg border border-ios-border rounded-xl px-4 py-3 text-ios-dark mb-2"
                  placeholderTextColor="#8E8E93"
                />
                <Text className="text-ios-grey4 text-sm mb-2">Confirm PIN</Text>
                <TextInput
                  value={confirmPin}
                  onChangeText={(t) => setConfirmPin(t.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••"
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry
                  className="bg-ios-bg border border-ios-border rounded-xl px-4 py-3 text-ios-dark mb-6"
                  placeholderTextColor="#8E8E93"
                />
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={loading || pin.length < 4 || pin !== confirmPin}
                  className="bg-primary rounded-xl py-3.5 items-center"
                  style={(loading || pin.length < 4 || pin !== confirmPin) && { opacity: 0.5 }}
                >
                  <Text className="text-white font-semibold">
                    {loading ? "Adding..." : "Add Card"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
