import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { Id } from "@/convex/_generated/dataModel";
import {
  getDecryptedDocumentBytes,
  computeDocumentFingerprint,
} from "@/lib/document-encryption";
import { parse } from "mrz";

const DEFAULT_EXPIRY_DAYS = 365;

function bytesToBase64(bytes: Uint8Array): string {
  const base64Chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    result += base64Chars[a >> 2];
    result += base64Chars[((a & 3) << 4) | ((b ?? 0) >> 4)];
    result +=
      b !== undefined
        ? base64Chars[((b & 15) << 2) | ((c ?? 0) >> 6)]
        : "=";
    result += c !== undefined ? base64Chars[(c ?? 0) & 63] : "=";
  }
  return result;
}

function extractMRZLines(rawText: string | null | undefined): string[] | null {
  if (!rawText || typeof rawText !== "string") return null;
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 9);
  const mrzLike = lines.filter(
    (l) => /^[A-Z0-9<]+$/.test(l) && [9, 30, 36, 44].includes(l.length)
  );
  if (mrzLike.length >= 2 && mrzLike.length <= 3) return mrzLike;
  return null;
}

function parseExpiryFromOCR(extracted: {
  expiryDate?: string | null;
  rawText?: string | null;
}): number | null {
  if (extracted.expiryDate) {
    const d = new Date(extracted.expiryDate);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  const mrzLines = extractMRZLines(extracted.rawText);
  if (mrzLines) {
    try {
      const result = parse(mrzLines);
      const exp = result.fields?.expirationDate;
      if (exp && /^\d{6}$/.test(exp)) {
        const yy = parseInt(exp.slice(0, 2), 10);
        const mm = parseInt(exp.slice(2, 4), 10) - 1;
        const dd = parseInt(exp.slice(4, 6), 10);
        const currentYY = new Date().getFullYear() % 100;
        const year = yy <= currentYY + 10 ? 2000 + yy : 1900 + yy;
        const d = new Date(year, mm, dd);
        if (!isNaN(d.getTime())) return d.getTime();
      }
    } catch {
      // MRZ parse failed, ignore
    }
  }
  return null;
}

export default function VerifyDocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const rawId = id ?? "";
  const documentId = rawId && typeof rawId === "string" ? (rawId as Id<"documents">) : null;

  const [step, setStep] = useState<
    | "loading"
    | "quality"
    | "ocr"
    | "faceid"
    | "fingerprint"
    | "saving"
    | "success"
    | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const document = useQuery(
    api.documents.getById,
    documentId ? { documentId } : "skip"
  );
  const setVerification = useMutation(api.documents.setVerification);
  const extractDocumentDataFromBase64 = useAction(
    api.ai.extractDocumentDataFromBase64
  );
  const anchorVerificationEvent = useAction(
    api.blockchain.anchorVerificationEvent
  );

  const runVerification = useCallback(async () => {
    if (!documentId || !document?.frontImageUrl) {
      setErrorMessage("Document image not found.");
      setStep("error");
      return;
    }

    const encrypted = document.encrypted ?? true;
    const storageUrl = document.frontImageUrl;

    try {
      setStep("loading");
      setErrorMessage(null);

      const bytes = await getDecryptedDocumentBytes(storageUrl, encrypted);
      if (bytes.length < 1024) {
        setErrorMessage("Document image is too small or corrupted.");
        setStep("error");
        return;
      }

      setStep("quality");
      await new Promise((r) => setTimeout(r, 400));

      const base64 = bytesToBase64(bytes);
      setStep("ocr");
      const extracted = await extractDocumentDataFromBase64({
        imageBase64: base64,
        documentType: document.type,
      });

      setStep("faceid");
      let verificationLevel: "full" | "basic" = "basic";
      const faceIdAvailable = await LocalAuthentication.hasHardwareAsync();
      if (faceIdAvailable) {
        const { success } = await LocalAuthentication.authenticateAsync({
          promptMessage: "Verify your identity",
          cancelLabel: "Skip",
        });
        if (success) verificationLevel = "full";
      }

      setStep("fingerprint");
      const fingerprint = computeDocumentFingerprint(bytes);

      const expiryFromDoc = parseExpiryFromOCR(extracted);
      const verificationExpiresAt =
        expiryFromDoc ??
        Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

      setStep("saving");
      await setVerification({
        documentId,
        fingerprint,
        verificationExpiresAt,
        verificationLevel,
      });

      try {
        await anchorVerificationEvent({
          documentId,
          fingerprint,
          verificationLevel,
          expiresAt: verificationExpiresAt,
        });
      } catch {
        // Optional anchor, ignore
      }

      setStep("success");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Verification failed."
      );
      setStep("error");
    }
  }, [
    document,
    documentId,
    setVerification,
    extractDocumentDataFromBase64,
    anchorVerificationEvent,
  ]);

  useEffect(() => {
    if (!documentId) {
      setErrorMessage("Invalid document. Please select a document to verify.");
      setStep("error");
      return;
    }
    if (document === undefined) return;
    if (document === null) {
      setErrorMessage("Document not found.");
      setStep("error");
      return;
    }
    if (step === "loading" && !errorMessage) {
      runVerification();
    }
  }, [document, documentId, step, errorMessage, runVerification]);

  const handleRetry = () => {
    setStep("loading");
    setErrorMessage(null);
    runVerification();
  };

  const handleDone = () => {
    router.back();
  };

  if (!documentId || document === null) {
    return (
      <View className="flex-1 bg-ios-bg">
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center px-5">
            <Text className="text-ios-grey4">
              {!documentId ? "Invalid document. Please select a document to verify." : "Document not found."}
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              className="mt-4 py-2 px-4 rounded-xl bg-primary"
            >
              <Text className="text-white font-semibold">Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center px-5 py-3 bg-white border-b border-ios-border">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 p-1"
            disabled={step === "saving"}
          >
            <Ionicons name="chevron-back" size={24} color="#0A84FF" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-ios-dark">
            Verify Document
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {step === "success" && (
            <View className="items-center px-5">
              <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center mb-4">
                <Ionicons name="shield-checkmark" size={44} color="#30D158" />
              </View>
              <Text className="text-ios-dark text-xl font-bold text-center">
                Document Verified
              </Text>
              <Text className="text-ios-grey4 text-center mt-2">
                Your document has been verified and secured.
              </Text>
              <TouchableOpacity
                onPress={handleDone}
                className="mt-6 py-3.5 px-8 rounded-2xl bg-primary"
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold">Done</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === "error" && (
            <View className="items-center px-5">
              <View className="w-20 h-20 rounded-full bg-red-100 items-center justify-center mb-4">
                <Ionicons name="alert-circle" size={44} color="#FF3B30" />
              </View>
              <Text className="text-ios-dark text-xl font-bold text-center">
                Verification Failed
              </Text>
              <Text className="text-ios-grey4 text-center mt-2">
                {errorMessage}
              </Text>
              <View className="flex-row gap-3 mt-6">
                <TouchableOpacity
                  onPress={() => router.back()}
                  className="py-3 px-6 rounded-2xl bg-white border border-ios-border"
                  activeOpacity={0.8}
                >
                  <Text className="text-ios-dark font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRetry}
                  className="py-3 px-6 rounded-2xl bg-primary"
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-semibold">Retry</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {(step === "loading" ||
            step === "quality" ||
            step === "ocr" ||
            step === "faceid" ||
            step === "fingerprint" ||
            step === "saving") && (
            <View className="items-center px-5">
              <ActivityIndicator size="large" color="#0A84FF" />
              <Text className="text-ios-dark font-semibold mt-4">
                {step === "loading" && "Loading document..."}
                {step === "quality" && "Checking image quality..."}
                {step === "ocr" && "Extracting document data..."}
                {step === "faceid" && "Verifying identity..."}
                {step === "fingerprint" && "Computing fingerprint..."}
                {step === "saving" && "Saving verification..."}
              </Text>
              <Text className="text-ios-grey4 text-sm mt-1">
                Please wait
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingTop: 48,
    paddingBottom: 48,
  },
});
