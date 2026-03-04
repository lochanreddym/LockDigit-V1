/**
 * Native (iOS/Android) Firebase Auth exports.
 * This file is only bundled on native platforms by Metro.
 */
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";

let confirmationResult: FirebaseAuthTypes.ConfirmationResult | null = null;
const TOKEN_CACHE_TTL_MS = 30_000;
let cachedToken: string | null = null;
let cachedTokenUid: string | null = null;
let cachedTokenAt = 0;

function clearTokenCache() {
  cachedToken = null;
  cachedTokenUid = null;
  cachedTokenAt = 0;
}

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
 * Ensure there's an authenticated Firebase session.
 * Used by simulator test flows that bypass real OTP verification.
 */
export async function ensureFirebaseSession(): Promise<FirebaseAuthTypes.User | null> {
  if (auth().currentUser) return auth().currentUser;
  const credential = await auth().signInAnonymously();
  return credential.user ?? auth().currentUser;
}

/**
 * Get the current Firebase auth token for Convex authentication.
 */
export async function getFirebaseToken(): Promise<string | null> {
  const now = Date.now();
  const user = auth().currentUser;
  if (!user) {
    clearTokenCache();
    return null;
  }

  if (
    cachedToken &&
    cachedTokenUid === user.uid &&
    now - cachedTokenAt < TOKEN_CACHE_TTL_MS
  ) {
    return cachedToken;
  }

  try {
    const token = await user.getIdToken();
    cachedToken = token;
    cachedTokenUid = user.uid;
    cachedTokenAt = now;
    return token;
  } catch (error: any) {
    const code = typeof error?.code === "string" ? error.code : "";
    const message = typeof error?.message === "string" ? error.message : "";
    const lowerMessage = message.toLowerCase();
    const hasRecoverableTokenExpiryMessage =
      lowerMessage.includes("token expired") ||
      lowerMessage.includes("expired token");

    // Fail-soft for transient auth/network refresh failures to keep UI responsive.
    const isRecoverable =
      code === "auth/network-request-failed" ||
      code === "auth/user-token-expired" ||
      code === "auth/internal-error" ||
      lowerMessage.includes("network") ||
      hasRecoverableTokenExpiryMessage;

    if (isRecoverable) {
      if (
        cachedToken &&
        cachedTokenUid === user.uid &&
        now - cachedTokenAt < TOKEN_CACHE_TTL_MS
      ) {
        return cachedToken;
      }
      return null;
    }
    throw error;
  }
}

/**
 * Sign out of Firebase.
 */
export async function signOutFirebase(): Promise<void> {
  const user = auth().currentUser;

  // If there's no signed-in user (e.g. simulator test flows), treat as a no-op
  if (!user) return;

  try {
    await auth().signOut();
  } finally {
    clearTokenCache();
  }
}

/**
 * Get current Firebase user.
 */
export function getCurrentUser(): FirebaseAuthTypes.User | null {
  return auth().currentUser;
}

/**
 * Subscribe to Firebase auth user changes.
 */
export function subscribeAuthState(
  listener: (user: FirebaseAuthTypes.User | null) => void
): () => void {
  return auth().onAuthStateChanged((user) => {
    if (!user || user.uid !== cachedTokenUid) {
      clearTokenCache();
    }
    listener(user);
  });
}
