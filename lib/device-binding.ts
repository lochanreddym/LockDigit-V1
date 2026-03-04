import * as Application from "expo-application";
import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import { storeDeviceId, getDeviceId } from "./secure-store";

const DEVICE_ID_FILE =
  (FileSystem.documentDirectory ?? "") + "lockdigit-device-id.txt";

/**
 * Get or generate an installation-scoped device fingerprint.
 * The file-backed value resets on app reinstall, which lets us
 * force OTP + PIN setup for fresh installs/new devices.
 */
export async function getOrCreateDeviceFingerprint(): Promise<string> {
  const installedDeviceId = await FileSystem.readAsStringAsync(DEVICE_ID_FILE).catch(
    () => null
  );
  if (installedDeviceId) {
    const secureStoreId = await getDeviceId();
    if (secureStoreId !== installedDeviceId) {
      await storeDeviceId(installedDeviceId);
    }
    return installedDeviceId;
  }

  let entropy = `${Platform.OS}:${Date.now()}`;
  if (Platform.OS === "android") {
    entropy = `${entropy}:${Application.getAndroidId() ?? "android"}`;
  } else if (Platform.OS === "ios") {
    const iosId = await Application.getIosIdForVendorAsync();
    entropy = `${entropy}:${iosId ?? "ios"}`;
  }

  const randomBytes = await Crypto.getRandomBytesAsync(16);
  const randomHex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  entropy = `${entropy}:${randomHex}`;

  // Hash the installation-scoped ID for privacy.
  const hashedId = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `lockdigit-device:${entropy}`
  );

  await storeDeviceId(hashedId);
  await FileSystem.writeAsStringAsync(DEVICE_ID_FILE, hashedId).catch(() => {});
  return hashedId;
}

/**
 * Verify the current device matches the stored device fingerprint
 */
export async function verifyDeviceBinding(storedDeviceId: string): Promise<boolean> {
  const currentDeviceId = await getDeviceId();
  return currentDeviceId === storedDeviceId;
}
