import * as SecureStore from "expo-secure-store";

const KEYS = {
  PIN_HASH: "lockdigit_pin_hash",
  PIN_SALT: "lockdigit_pin_salt",
  DEVICE_ID: "lockdigit_device_id",
  AUTH_TOKEN: "lockdigit_auth_token",
  USER_ID: "lockdigit_user_id",
  HAS_COMPLETED_SETUP: "lockdigit_setup_complete",
} as const;

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

// Device ID
export async function storeDeviceId(deviceId: string): Promise<void> {
  await setItem(KEYS.DEVICE_ID, deviceId);
}

export async function getDeviceId(): Promise<string | null> {
  return await getItem(KEYS.DEVICE_ID);
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

// Setup state
export async function setSetupComplete(): Promise<void> {
  await setItem(KEYS.HAS_COMPLETED_SETUP, "true");
}

export async function hasCompletedSetup(): Promise<boolean> {
  const value = await getItem(KEYS.HAS_COMPLETED_SETUP);
  return value === "true";
}

// Clear all
export async function clearAll(): Promise<void> {
  await Promise.all(
    Object.values(KEYS).map((key) => deleteItem(key))
  );
}

export { KEYS };
