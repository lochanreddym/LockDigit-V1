import * as Crypto from "expo-crypto";
import { storePinHash, getPinHash } from "./secure-store";

/**
 * Generate a random salt for PIN hashing
 */
export async function generateSalt(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hash a PIN with a salt using SHA-256
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = `${salt}:${pin}`;
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data
  );
  return hash;
}

/**
 * Create and store a new PIN
 */
export async function createPin(pin: string): Promise<{ hash: string; salt: string }> {
  const salt = await generateSalt();
  const hash = await hashPin(pin, salt);
  await storePinHash(hash, salt);
  return { hash, salt };
}

/**
 * Validate a PIN against the stored hash
 */
export async function validatePin(pin: string): Promise<boolean> {
  const { hash: storedHash, salt } = await getPinHash();
  if (!storedHash || !salt) return false;

  const hash = await hashPin(pin, salt);
  return hash === storedHash;
}

/**
 * Check if a PIN meets the requirements
 */
export function isPinValid(pin: string): { valid: boolean; error?: string } {
  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: "PIN must contain only digits" };
  }
  if (pin.length !== 4 && pin.length !== 6) {
    return { valid: false, error: "PIN must be 4 or 6 digits" };
  }
  // Check for sequential patterns
  const sequential = "0123456789";
  const reverseSequential = "9876543210";
  if (sequential.includes(pin) || reverseSequential.includes(pin)) {
    return { valid: false, error: "PIN cannot be a sequential pattern" };
  }
  // Check for repeated digits
  if (/^(\d)\1+$/.test(pin)) {
    return { valid: false, error: "PIN cannot be all the same digit" };
  }
  return { valid: true };
}
