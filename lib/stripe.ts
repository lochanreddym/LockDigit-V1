import { Alert } from "react-native";

/**
 * Stripe helper utilities.
 * The actual Stripe provider is configured in the root layout.
 * Payment processing happens through Convex server actions that
 * create PaymentIntents using the Stripe secret key.
 */

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

export interface QRPaymentData {
  merchantId: string;
  merchantName: string;
  amount: number; // in cents, 0 means sender should enter amount
  currency: string;
  reference?: string;
  isReceiveMoneyQR?: boolean;
}

/**
 * Parse a merchant/receive-money QR code payload.
 * Merchant format: lockdigit://pay?merchant=X&name=Y&amount=Z&currency=USD&ref=R
 * Receive money format: lockdigit://pay?merchant=PHONE&name=NAME (no amount)
 */
export function parseQRPaymentData(qrData: string): QRPaymentData | null {
  try {
    if (qrData.startsWith("lockdigit://pay")) {
      const url = new URL(qrData);
      const merchantId = url.searchParams.get("merchant");
      const merchantName = url.searchParams.get("name");
      const amount = url.searchParams.get("amount");
      const currency = url.searchParams.get("currency") || "USD";
      const reference = url.searchParams.get("ref") || undefined;

      if (!merchantId || !merchantName) return null;

      const isReceiveMoneyQR = !amount;

      return {
        merchantId,
        merchantName: decodeURIComponent(merchantName),
        amount: amount ? parseInt(amount, 10) : 0,
        currency,
        reference,
        isReceiveMoneyQR,
      };
    }

    const data = JSON.parse(qrData);
    if (data.merchantId && data.amount) {
      return data as QRPaymentData;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Show payment error to user.
 */
export function showPaymentError(error: unknown): void {
  const message =
    error instanceof Error ? error.message : "An unexpected payment error occurred.";
  Alert.alert("Payment Failed", message);
}
