import { useEffect, useState } from "react";
import { resolveDocumentImageUri } from "@/lib/document-encryption";

export interface DocumentWithImageUris {
  _id: string;
  encrypted?: boolean;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  frontMimeType?: string | null;
  backMimeType?: string | null;
}

export function useResolvedDocumentImages(
  documents: DocumentWithImageUris[] | null | undefined
) {
  const [frontImageUris, setFrontImageUris] = useState<Record<string, string>>(
    {}
  );
  const [backImageUris, setBackImageUris] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    if (!documents || documents.length === 0) {
      setFrontImageUris({});
      setBackImageUris({});
      return;
    }

    let cancelled = false;

    const resolveImages = async () => {
      const nextFrontUris: Record<string, string> = {};
      const nextBackUris: Record<string, string> = {};

      await Promise.all(
        documents.map(async (doc) => {
          try {
            const frontUri = await resolveDocumentImageUri({
              storageUrl: doc.frontImageUrl,
              encrypted: doc.encrypted,
              mimeType: doc.frontMimeType,
            });
            if (frontUri) nextFrontUris[doc._id] = frontUri;
          } catch {
            if (!doc.encrypted && doc.frontImageUrl) {
              nextFrontUris[doc._id] = doc.frontImageUrl;
            }
          }

          if (!doc.backImageUrl) return;

          try {
            const backUri = await resolveDocumentImageUri({
              storageUrl: doc.backImageUrl,
              encrypted: doc.encrypted,
              mimeType: doc.backMimeType || doc.frontMimeType,
            });
            if (backUri) nextBackUris[doc._id] = backUri;
          } catch {
            if (!doc.encrypted) nextBackUris[doc._id] = doc.backImageUrl;
          }
        })
      );

      if (cancelled) return;
      setFrontImageUris(nextFrontUris);
      setBackImageUris(nextBackUris);
    };

    void resolveImages();

    return () => {
      cancelled = true;
    };
  }, [documents]);

  return { frontImageUris, backImageUris };
}
