import { Platform } from "react-native";

/**
 * Platform-aware Firebase Auth wrapper.
 *
 * @react-native-firebase/auth is native-only and cannot be imported on web.
 * This wrapper uses conditional require() to avoid loading the native module
 * on web, providing no-op fallbacks instead.
 */

let confirmationResult: any = null;

// Conditionally load the native Firebase auth module
const getAuth = () => {
  if (Platform.OS === "web") {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const auth = require("@react-native-firebase/auth").default;
  return auth;
};

/**
 * Send OTP to the given phone number.
 * Returns the confirmation result for later verification.
 */
export async function sendOTP(phoneNumber: string): Promise<any> {
  const auth = getAuth();
  if (!auth) {
    throw new Error("Firebase Phone Auth is not available on web.");
  }
  const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
  confirmationResult = confirmation;
  return confirmation;
}

/**
 * Verify the OTP code entered by the user.
 * Returns the Firebase user on success.
 */
export async function verifyOTP(code: string): Promise<any | null> {
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
  const auth = getAuth();
  if (!auth) return null;
  const user = auth().currentUser;
  if (!user) return null;
  return await user.getIdToken();
}

/**
 * Sign out of Firebase.
 */
export async function signOutFirebase(): Promise<void> {
  const auth = getAuth();
  if (!auth) return;
  await auth().signOut();
}

/**
 * Get current Firebase user.
 */
export function getCurrentUser(): any | null {
  const auth = getAuth();
  if (!auth) return null;
  return auth().currentUser;
}
