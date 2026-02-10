import React from "react";

/**
 * Web fallback for Stripe (native-only module).
 * This file is only bundled on web by Metro.
 */

export function StripeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useConfirmPayment() {
  return {
    confirmPayment: async () => ({
      error: { message: "Stripe payments are not available on web." },
    }),
  };
}
