/**
 * Web fallback for Firebase Auth (native-only module).
 * This file is only bundled on web by Metro.
 */

export async function sendOTP(_phoneNumber: string): Promise<any> {
  throw new Error("Firebase Phone Auth is not available on web.");
}

export async function verifyOTP(_code: string): Promise<any> {
  throw new Error("Firebase Phone Auth is not available on web.");
}

export async function getFirebaseToken(): Promise<string | null> {
  return null;
}

export async function signOutFirebase(): Promise<void> {
  // no-op on web
}

export function getCurrentUser(): any {
  return null;
}
