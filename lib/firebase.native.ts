/**
 * Native (iOS/Android) Firebase Auth exports.
 * This file is only bundled on native platforms by Metro.
 */
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";

let confirmationResult: FirebaseAuthTypes.ConfirmationResult | null = null;

/**
 * Send OTP to the given phone number.
 */
export async function sendOTP(
  phoneNumber: string
): Promise<FirebaseAuthTypes.ConfirmationResult> {
  const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
  confirmationResult = confirmation;
  return confirmation;
}

/**
 * Verify the OTP code entered by the user.
 */
export async function verifyOTP(
  code: string
): Promise<FirebaseAuthTypes.User | null> {
  if (!confirmationResult) {
    throw new Error("No OTP request in progress. Call sendOTP first.");
  }
  const credential = await confirmationResult.confirm(code);
  confirmationResult = null;
  return credential?.user ?? null;
}

/**
 * Get the current Firebase auth token for Convex authentication.
 */
export async function getFirebaseToken(): Promise<string | null> {
  const user = auth().currentUser;
  if (!user) return null;
  return await user.getIdToken();
}

/**
 * Sign out of Firebase.
 */
export async function signOutFirebase(): Promise<void> {
  await auth().signOut();
}

/**
 * Get current Firebase user.
 */
export function getCurrentUser(): FirebaseAuthTypes.User | null {
  return auth().currentUser;
}
