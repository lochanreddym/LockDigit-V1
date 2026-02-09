import * as Application from "expo-application";
import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import { storeDeviceId, getDeviceId } from "./secure-store";

/**
 * Get or generate a unique device fingerprint.
 * On Android, uses androidId.
 * On iOS, uses identifierForVendor.
 * Falls back to a generated UUID stored in secure storage.
 */
export async function getOrCreateDeviceFingerprint(): Promise<string> {
  // Check if we already have a stored device ID
  const storedId = await getDeviceId();
  if (storedId) return storedId;

  let deviceId: string | null = null;

  if (Platform.OS === "android") {
    deviceId = Application.getAndroidId();
  } else if (Platform.OS === "ios") {
    deviceId = await Application.getIosIdForVendorAsync();
  }

  // Fallback: generate a UUID
  if (!deviceId) {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    deviceId = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Hash the device ID for privacy
  const hashedId = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `lockdigit-device:${deviceId}`
  );

  await storeDeviceId(hashedId);
  return hashedId;
}

/**
 * Verify the current device matches the stored device fingerprint
 */
export async function verifyDeviceBinding(storedDeviceId: string): Promise<boolean> {
  const currentDeviceId = await getDeviceId();
  return currentDeviceId === storedDeviceId;
}
