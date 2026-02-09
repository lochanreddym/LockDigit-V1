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
  amount: number; // in cents
  currency: string;
  reference?: string;
}

/**
 * Parse a merchant QR code payload.
 * Expected format: lockdigit://pay?merchant=X&name=Y&amount=Z&currency=USD&ref=R
 */
export function parseQRPaymentData(qrData: string): QRPaymentData | null {
  try {
    // Handle lockdigit:// scheme
    if (qrData.startsWith("lockdigit://pay")) {
      const url = new URL(qrData);
      const merchantId = url.searchParams.get("merchant");
      const merchantName = url.searchParams.get("name");
      const amount = url.searchParams.get("amount");
      const currency = url.searchParams.get("currency") || "USD";
      const reference = url.searchParams.get("ref") || undefined;

      if (!merchantId || !merchantName || !amount) return null;

      return {
        merchantId,
        merchantName: decodeURIComponent(merchantName),
        amount: parseInt(amount, 10),
        currency,
        reference,
      };
    }

    // Try JSON format as fallback
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
