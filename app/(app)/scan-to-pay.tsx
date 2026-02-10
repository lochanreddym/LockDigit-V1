import React, { useState, useRef } from "react";
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
import { ScreenWrapper } from "@/components/common";
import { GlassCard, GlassButton } from "@/components/glass";
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
        // Don't need to create a failed transaction here; the Stripe webhook or
        // the transaction was already created as pending by createPaymentIntent
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
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center">
          <Text className="text-white/50">Requesting camera permission...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="camera-outline" size={64} color="rgba(255,255,255,0.3)" />
          <Text className="text-white text-xl font-bold mt-4 text-center">
            Camera Access Required
          </Text>
          <Text className="text-white/50 text-center mt-2 mb-6">
            LockDigit needs camera access to scan QR codes for payments.
          </Text>
          <GlassButton
            title="Grant Permission"
            onPress={requestPermission}
            size="lg"
          />
          <TouchableOpacity onPress={() => router.back()} className="mt-4">
            <Text className="text-primary">Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  // Payment confirmation view
  if (paymentData) {
    return (
      <ScreenWrapper>
        <View className="flex-1 px-6 justify-center">
          <TouchableOpacity
            onPress={() => {
              setPaymentData(null);
              setScanned(false);
            }}
            className="absolute top-4 left-6 z-10 p-2"
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View className="items-center mb-6">
            <View className="w-20 h-20 rounded-full bg-primary/20 items-center justify-center mb-4">
              <Ionicons name="qr-code" size={40} color="#6C63FF" />
            </View>
            <Text className="text-white text-xl font-bold">
              Confirm Payment
            </Text>
          </View>

          <GlassCard className="mb-6">
            <View className="items-center py-4">
              <Text className="text-white/60 text-sm">Paying to</Text>
              <Text className="text-white text-xl font-bold mt-1">
                {paymentData.merchantName}
              </Text>
              <Text className="text-white text-4xl font-bold mt-4">
                {formatCurrency(paymentData.amount)}
              </Text>
              {paymentData.reference && (
                <Text className="text-white/40 text-sm mt-2">
                  Ref: {paymentData.reference}
                </Text>
              )}
            </View>
          </GlassCard>

          <GlassButton
            title={
              processing
                ? "Processing..."
                : `Pay ${formatCurrency(paymentData.amount)}`
            }
            onPress={handleConfirmPayment}
            loading={processing}
            size="lg"
            icon={<Ionicons name="card" size={20} color="#FFFFFF" />}
            className="mb-3"
          />
          <GlassButton
            title="Cancel"
            onPress={() => {
              setPaymentData(null);
              setScanned(false);
            }}
            variant="glass"
            size="lg"
          />
        </View>
      </ScreenWrapper>
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
        <View className="absolute top-0 left-0 right-0 bg-black/50 px-6 pt-16 pb-6">
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

        {/* Scan frame */}
        <View
          style={{
            width: SCAN_AREA_SIZE,
            height: SCAN_AREA_SIZE,
            borderWidth: 2,
            borderColor: "#6C63FF",
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
