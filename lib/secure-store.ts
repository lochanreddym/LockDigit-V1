import * as SecureStore from "expo-secure-store";

export type DarkModePreference = "light" | "dark" | "system";

const KEYS = {
  PIN_HASH: "lockdigit_pin_hash",
  PIN_SALT: "lockdigit_pin_salt",
  PIN_LENGTH: "lockdigit_pin_length",
  DEVICE_ID: "lockdigit_device_id",
  DOCUMENT_ENCRYPTION_KEY: "lockdigit_document_encryption_key",
  AUTH_TOKEN: "lockdigit_auth_token",
  USER_ID: "lockdigit_user_id",
  PHONE: "lockdigit_phone",
  HAS_COMPLETED_SETUP: "lockdigit_setup_complete",
  FACE_ID_ENABLED: "lockdigit_face_id_enabled",
  DARK_MODE: "lockdigit_dark_mode",
  PUSH_NOTIFICATIONS_ENABLED: "lockdigit_push_notifications_enabled",
  SECURITY_ALERTS_ENABLED: "lockdigit_security_alerts_enabled",
  TWO_FACTOR_ENABLED: "lockdigit_two_factor_enabled",
} as const;

const SESSION_KEYS_TO_CLEAR = [
  KEYS.PIN_HASH,
  KEYS.PIN_SALT,
  KEYS.PIN_LENGTH,
  KEYS.DOCUMENT_ENCRYPTION_KEY,
  KEYS.AUTH_TOKEN,
  KEYS.USER_ID,
  KEYS.PHONE,
  KEYS.HAS_COMPLETED_SETUP,
] as const;

export async function setItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function getItem(key: string): Promise<string | null> {
  return await SecureStore.getItemAsync(key);
}

export async function deleteItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

// PIN storage
export async function storePinHash(hash: string, salt: string): Promise<void> {
  await setItem(KEYS.PIN_HASH, hash);
  await setItem(KEYS.PIN_SALT, salt);
}

export async function getPinHash(): Promise<{
  hash: string | null;
  salt: string | null;
}> {
  const hash = await getItem(KEYS.PIN_HASH);
  const salt = await getItem(KEYS.PIN_SALT);
  return { hash, salt };
}

export async function storePinLength(length: string): Promise<void> {
  await setItem(KEYS.PIN_LENGTH, length);
}

export async function getPinLength(): Promise<number> {
  const value = await getItem(KEYS.PIN_LENGTH);
  if (value === "4" || value === "6") return parseInt(value, 10);
  return 6;
}

// Device ID
export async function storeDeviceId(deviceId: string): Promise<void> {
  await setItem(KEYS.DEVICE_ID, deviceId);
}

export async function getDeviceId(): Promise<string | null> {
  return await getItem(KEYS.DEVICE_ID);
}

// Document encryption key
export async function storeDocumentEncryptionKey(
  keyHex: string
): Promise<void> {
  await setItem(KEYS.DOCUMENT_ENCRYPTION_KEY, keyHex);
}

export async function getDocumentEncryptionKey(): Promise<string | null> {
  return await getItem(KEYS.DOCUMENT_ENCRYPTION_KEY);
}

// Auth token
export async function storeAuthToken(token: string): Promise<void> {
  await setItem(KEYS.AUTH_TOKEN, token);
}

export async function getAuthToken(): Promise<string | null> {
  return await getItem(KEYS.AUTH_TOKEN);
}

// User ID
export async function storeUserId(userId: string): Promise<void> {
  await setItem(KEYS.USER_ID, userId);
}

export async function getUserId(): Promise<string | null> {
  return await getItem(KEYS.USER_ID);
}

// Phone
export async function storePhone(phone: string): Promise<void> {
  await setItem(KEYS.PHONE, phone);
}

export async function getPhone(): Promise<string | null> {
  return await getItem(KEYS.PHONE);
}

// Setup state
export async function setSetupComplete(): Promise<void> {
  await setItem(KEYS.HAS_COMPLETED_SETUP, "true");
}

export async function hasCompletedSetup(): Promise<boolean> {
  const value = await getItem(KEYS.HAS_COMPLETED_SETUP);
  return value === "true";
}

// Face ID
export async function setFaceIdEnabled(enabled: boolean): Promise<void> {
  await setItem(KEYS.FACE_ID_ENABLED, enabled ? "true" : "false");
}

export async function isFaceIdEnabled(): Promise<boolean> {
  const value = await getItem(KEYS.FACE_ID_ENABLED);
  return value === "true";
}

// Dark mode preference: "light" | "dark" | "system"
export async function getDarkModePreference(): Promise<DarkModePreference> {
  const value = await getItem(KEYS.DARK_MODE);
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
}

export async function setDarkModePreference(value: DarkModePreference): Promise<void> {
  await setItem(KEYS.DARK_MODE, value);
}

export async function getPushNotificationsEnabled(): Promise<boolean> {
  const value = await getItem(KEYS.PUSH_NOTIFICATIONS_ENABLED);
  return value !== "false";
}

export async function setPushNotificationsEnabled(enabled: boolean): Promise<void> {
  await setItem(KEYS.PUSH_NOTIFICATIONS_ENABLED, enabled ? "true" : "false");
}

export async function getSecurityAlertsEnabled(): Promise<boolean> {
  const value = await getItem(KEYS.SECURITY_ALERTS_ENABLED);
  return value !== "false";
}

export async function setSecurityAlertsEnabled(enabled: boolean): Promise<void> {
  await setItem(KEYS.SECURITY_ALERTS_ENABLED, enabled ? "true" : "false");
}

export async function getTwoFactorEnabled(): Promise<boolean> {
  const value = await getItem(KEYS.TWO_FACTOR_ENABLED);
  return value === "true";
}

export async function setTwoFactorEnabled(enabled: boolean): Promise<void> {
  await setItem(KEYS.TWO_FACTOR_ENABLED, enabled ? "true" : "false");
}

// Clear all
export async function clearAll(): Promise<void> {
  await Promise.all(
    Object.values(KEYS).map((key) => deleteItem(key))
  );
}

// Clears only auth/session data while preserving local device + preference settings.
export async function clearSession(): Promise<void> {
  await Promise.all(SESSION_KEYS_TO_CLEAR.map((key) => deleteItem(key)));
}

export { KEYS };
