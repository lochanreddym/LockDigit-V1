import { Platform } from "react-native";
import React from "react";

/**
 * Platform-aware re-exports of @stripe/stripe-react-native.
 *
 * The Stripe RN SDK uses native codegen modules that are not available on web.
 * This wrapper avoids importing the native module on web, providing no-op
 * fallbacks instead.
 */

let StripeProvider: React.ComponentType<any>;
let useConfirmPayment: () => {
  confirmPayment: (
    clientSecret: string,
    params: any
  ) => Promise<{ error?: { message: string } }>;
};

if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const stripe = require("@stripe/stripe-react-native");
  StripeProvider = stripe.StripeProvider;
  useConfirmPayment = stripe.useConfirmPayment;
} else {
  // Web fallback – Stripe RN is not supported on web
  StripeProvider = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  );
  useConfirmPayment = () => ({
    confirmPayment: async () => ({
      error: { message: "Stripe payments are not available on web." },
    }),
  });
}

export { StripeProvider, useConfirmPayment };
