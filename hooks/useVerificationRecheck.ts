import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  getDecryptedDocumentBytes,
  computeDocumentFingerprint,
} from "@/lib/document-encryption";

export interface DocumentForRecheck {
  _id: Id<"documents">;
  verified?: boolean;
  verificationFingerprint?: string | null;
  verificationExpiresAt?: number | null;
  frontImageUrl?: string | null;
  encrypted?: boolean;
}

export function useVerificationRecheck(
  documents: DocumentForRecheck[] | null | undefined
) {
  const revokeVerification = useMutation(api.documents.revokeVerification);
  const checkedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!documents || documents.length === 0) return;

    const verified = documents.filter(
      (d) =>
        d.verified &&
        d.verificationFingerprint &&
        d.frontImageUrl
    );

    if (verified.length === 0) return;

    let cancelled = false;

    const recheck = async () => {
      for (const doc of verified) {
        if (cancelled) return;
        const key = `${doc._id}:${doc.verificationFingerprint ?? ""}:${doc.verificationExpiresAt ?? ""}`;
        if (checkedRef.current.has(key)) continue;

        try {
          const bytes = await getDecryptedDocumentBytes(
            doc.frontImageUrl!,
            doc.encrypted ?? true
          );
          const fingerprint = computeDocumentFingerprint(bytes);
          const stored = doc.verificationFingerprint ?? "";
          const expired =
            (doc.verificationExpiresAt ?? 0) > 0 &&
            Date.now() >= (doc.verificationExpiresAt ?? 0);

          if (fingerprint !== stored || expired) {
            await revokeVerification({ documentId: doc._id });
          }
          checkedRef.current.add(key);
        } catch (err) {
          console.error("Verification recheck failed for document", doc._id, err);
          checkedRef.current.add(key);
        }
      }
    };

    void recheck();

    return () => {
      cancelled = true;
    };
  }, [documents, revokeVerification]);
}
