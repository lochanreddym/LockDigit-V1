import * as Crypto from "expo-crypto";
import { File, Paths } from "expo-file-system";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { bytesToHex, concatBytes, hexToBytes } from "@noble/ciphers/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  getDocumentEncryptionKey,
  storeDocumentEncryptionKey,
} from "./secure-store";

const ENCRYPTION_VERSION = 1;
const KEY_LENGTH = 32;
const NONCE_LENGTH = 24;

const decryptedUriCache = new Map<string, Promise<string>>();

type ImageMimeType = string | null | undefined;

export interface ResolvableDocumentImage {
  storageUrl?: string | null;
  encrypted?: boolean;
  mimeType?: string | null;
}

export interface EncryptedUploadPayload {
  encryptedBlob: Blob;
  contentHash: string;
  mimeType: string;
  encryptionVersion: number;
}

async function getOrCreateDocumentEncryptionKey(): Promise<Uint8Array> {
  const existingKey = await getDocumentEncryptionKey();
  if (existingKey) {
    try {
      const parsed = hexToBytes(existingKey);
      if (parsed.length !== KEY_LENGTH) {
        const err = new Error(
          `Stored document encryption key has invalid length: ${parsed.length}, expected ${KEY_LENGTH}`
        );
        console.error(err);
        throw err;
      }
      return parsed;
    } catch (err) {
      if (err instanceof Error && err.message.includes("invalid length")) {
        throw err;
      }
      const msg =
        err instanceof Error ? err.message : "Failed to parse stored key";
      console.error("Document encryption key parse failed:", msg);
      throw new Error(
        `Stored document encryption key is corrupted: ${msg}. Please re-add your documents.`
      );
    }
  }

  const generatedKey = await Crypto.getRandomBytesAsync(KEY_LENGTH);
  await storeDocumentEncryptionKey(bytesToHex(generatedKey));
  return generatedKey;
}

function packageEncryptedBytes(
  nonce: Uint8Array,
  ciphertext: Uint8Array
): Uint8Array {
  return concatBytes(Uint8Array.of(ENCRYPTION_VERSION), nonce, ciphertext);
}

function unpackEncryptedBytes(payload: Uint8Array) {
  if (payload.length <= 1 + NONCE_LENGTH) {
    throw new Error("Encrypted payload is malformed");
  }
  const version = payload[0];
  if (version !== ENCRYPTION_VERSION) {
    throw new Error("Unsupported document encryption version");
  }
  const nonce = payload.subarray(1, 1 + NONCE_LENGTH);
  const ciphertext = payload.subarray(1 + NONCE_LENGTH);
  return { nonce, ciphertext };
}

function extensionFromMimeType(mimeType: ImageMimeType): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    case "image/gif":
      return "gif";
    case "application/pdf":
      return "pdf";
    default:
      return "jpg";
  }
}

function writeBytesToCacheFile(
  bytes: Uint8Array,
  mimeType: ImageMimeType
): string {
  const extension = extensionFromMimeType(mimeType);
  const file = new File(
    Paths.cache,
    `lockdigit-doc-${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`
  );
  file.create({ intermediates: true, overwrite: true });
  file.write(bytes);
  return file.uri;
}

async function decryptStorageBytes(storageUrl: string): Promise<Uint8Array> {
  const key = await getOrCreateDocumentEncryptionKey();
  const response = await fetch(storageUrl);
  if (!response.ok) {
    throw new Error("Unable to load encrypted document");
  }
  const encryptedBytes = new Uint8Array(await response.arrayBuffer());
  const { nonce, ciphertext } = unpackEncryptedBytes(encryptedBytes);
  const cipher = xchacha20poly1305(key, nonce);
  return cipher.decrypt(ciphertext);
}

export async function encryptDocumentBlob(blob: Blob): Promise<EncryptedUploadPayload> {
  const key = await getOrCreateDocumentEncryptionKey();
  const nonce = await Crypto.getRandomBytesAsync(NONCE_LENGTH);
  const plaintext = new Uint8Array(await blob.arrayBuffer());
  const cipher = xchacha20poly1305(key, nonce);
  const ciphertext = cipher.encrypt(plaintext);
  const packedEncryptedBytes = packageEncryptedBytes(nonce, ciphertext);
  const packedArrayBuffer = packedEncryptedBytes.buffer.slice(
    packedEncryptedBytes.byteOffset,
    packedEncryptedBytes.byteOffset + packedEncryptedBytes.byteLength
  ) as ArrayBuffer;

  return {
    encryptedBlob: new Blob([packedArrayBuffer], {
      type: "application/octet-stream",
    }),
    contentHash: bytesToHex(sha256(packedEncryptedBytes)),
    mimeType: blob.type || "image/jpeg",
    encryptionVersion: ENCRYPTION_VERSION,
  };
}

export async function resolveDocumentImageUri(
  image: ResolvableDocumentImage
): Promise<string | null> {
  const storageUrl = image.storageUrl ?? null;
  if (!storageUrl) return null;
  if (!image.encrypted) return storageUrl;

  const cacheKey = `${storageUrl}|${image.mimeType ?? ""}`;
  const cached = decryptedUriCache.get(cacheKey);
  if (cached) return await cached;

  const resolvePromise = (async () => {
    const decryptedBytes = await decryptStorageBytes(storageUrl);
    return writeBytesToCacheFile(decryptedBytes, image.mimeType);
  })();

  decryptedUriCache.set(cacheKey, resolvePromise);
  try {
    return await resolvePromise;
  } catch (error) {
    decryptedUriCache.delete(cacheKey);
    throw error;
  }
}

export async function getDecryptedDocumentBytes(
  storageUrl: string,
  encrypted: boolean = true
): Promise<Uint8Array> {
  if (!encrypted) {
    const response = await fetch(storageUrl);
    if (!response.ok) throw new Error("Unable to load document");
    return new Uint8Array(await response.arrayBuffer());
  }
  return decryptStorageBytes(storageUrl);
}

export function computeDocumentFingerprint(bytes: Uint8Array): string {
  return bytesToHex(sha256(bytes));
}
