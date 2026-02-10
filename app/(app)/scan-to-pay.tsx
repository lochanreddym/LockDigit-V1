import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useAction, useMutation } from "convex/react";
import { useConfirmPayment } from "@/lib/stripe-native";
import { api } from "@/convex/_generated/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassButton } from "@/components/glass";
import { parseQRPaymentData, showPaymentError } from "@/lib/stripe";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";

const { width } = Dimensions.get("window");
const SCAN_AREA_SIZE = width * 0.7;

export default function ScanToPayScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;
  const { confirmPayment } = useConfirmPayment();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [paymentData, setPaymentData] = useState<ReturnType<
    typeof parseQRPaymentData
  > | null>(null);
  const [processing, setProcessing] = useState(false);

  const createPaymentIntent = useAction(api.payments.createPaymentIntent);
  const updateTransactionStatus = useMutation(
    api.payments.updateTransactionStatus
  );

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);

    const data = parseQRPaymentData(result.data);
    if (data) {
      setPaymentData(data);
    } else {
      Alert.alert(
        "Invalid QR Code",
        "This QR code doesn't contain valid payment information.",
        [{ text: "Scan Again", onPress: () => setScanned(false) }]
      );
    }
  };

  const handleConfirmPayment = async () => {
    if (!paymentData || !convexUserId) return;

    setProcessing(true);
    try {
      const { clientSecret, paymentIntentId } = await createPaymentIntent({
        amount: paymentData.amount,
        currency: paymentData.currency,
        userId: convexUserId,
        description: `Payment to ${paymentData.merchantName}`,
      });

      const { error } = await confirmPayment(clientSecret, {
        paymentMethodType: "Card",
      });

      if (error) {
        showPaymentError(error);
      } else {
        Alert.alert(
          "Payment Successful",
          `${formatCurrency(paymentData.amount)} paid to ${paymentData.merchantName}`,
          [{ text: "Done", onPress: () => router.back() }]
        );
      }
    } catch (error) {
      showPaymentError(error);
    } finally {
      setProcessing(false);
    }
  };

  // Permission handling
  if (!permission) {
    return (
      <View className="flex-1 bg-ios-bg items-center justify-center">
        <Text className="text-ios-grey4">Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-ios-bg">
        <SafeAreaView className="flex-1 items-center justify-center px-8">
          <Ionicons name="camera-outline" size={64} color="#C7C7CC" />
          <Text className="text-ios-dark text-xl font-bold mt-4 text-center">
            Camera Access Required
          </Text>
          <Text className="text-ios-grey4 text-center mt-2 mb-6">
            LockDigit needs camera access to scan QR codes for payments.
          </Text>
          <GlassButton
            title="Grant Permission"
            onPress={requestPermission}
            size="lg"
            fullWidth
          />
          <TouchableOpacity onPress={() => router.back()} className="mt-4">
            <Text className="text-primary">Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // Payment confirmation view
  if (paymentData) {
    return (
      <View className="flex-1 bg-ios-bg">
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="flex-row items-center px-5 py-3">
            <TouchableOpacity
              onPress={() => {
                setPaymentData(null);
                setScanned(false);
              }}
              className="mr-3 p-1"
            >
              <Ionicons name="chevron-back" size={24} color="#0A84FF" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-ios-dark">Confirm Payment</Text>
          </View>

          <View className="flex-1 px-5 justify-center">
            <View className="items-center mb-6">
              <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
                <Ionicons name="qr-code" size={40} color="#0A84FF" />
              </View>
            </View>

            <View
              className="bg-white rounded-3xl border border-ios-border p-5 mb-6"
              style={styles.cardShadow}
            >
              <View className="items-center py-4">
                <Text className="text-ios-grey4 text-sm">Paying to</Text>
                <Text className="text-ios-dark text-xl font-bold mt-1">
                  {paymentData.merchantName}
                </Text>
                <Text className="text-ios-dark text-4xl font-bold mt-4">
                  {formatCurrency(paymentData.amount)}
                </Text>
                {paymentData.reference && (
                  <Text className="text-ios-grey4 text-sm mt-2">
                    Ref: {paymentData.reference}
                  </Text>
                )}
              </View>
            </View>

            <GlassButton
              title={
                processing
                  ? "Processing..."
                  : `Pay ${formatCurrency(paymentData.amount)}`
              }
              onPress={handleConfirmPayment}
              loading={processing}
              size="lg"
              fullWidth
              icon={<Ionicons name="card" size={20} color="#FFFFFF" />}
              className="mb-3"
            />
            <GlassButton
              title="Cancel"
              onPress={() => {
                setPaymentData(null);
                setScanned(false);
              }}
              variant="secondary"
              size="lg"
              fullWidth
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Camera scanner view
  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay */}
      <View style={StyleSheet.absoluteFill} className="items-center justify-center">
        {/* Top overlay */}
        <SafeAreaView className="absolute top-0 left-0 right-0" edges={["top"]}>
          <View className="bg-black/50 px-6 pt-4 pb-6">
            <View className="flex-row items-center">
              <TouchableOpacity onPress={() => router.back()} className="p-2 mr-3">
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <View>
                <Text className="text-white text-xl font-bold">Scan to Pay</Text>
                <Text className="text-white/60 text-sm mt-0.5">
                  Point your camera at a merchant QR code
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>

        {/* Scan frame */}
        <View
          style={{
            width: SCAN_AREA_SIZE,
            height: SCAN_AREA_SIZE,
            borderWidth: 3,
            borderColor: "#0A84FF",
            borderRadius: 24,
          }}
        />

        {/* Bottom overlay */}
        <View className="absolute bottom-0 left-0 right-0 bg-black/50 px-6 py-10 items-center">
          <Text className="text-white/60 text-sm">
            Align QR code within the frame
          </Text>
        </View>
      </View>
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
});
