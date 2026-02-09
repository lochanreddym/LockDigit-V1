import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ScreenWrapper, Header, EmptyState } from "@/components/common";
import { GlassCard, GlassButton } from "@/components/glass";
import { DocumentCard, DocumentUploader } from "@/components/documents";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import { Config } from "@/constants/Config";

export default function WalletScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;

  const [showUpload, setShowUpload] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [frontImageUri, setFrontImageUri] = useState<string>("");
  const [backImageUri, setBackImageUri] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const documents = useQuery(
    api.documents.listByUser,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);
  const extractDocumentData = useAction(api.ai.extractDocumentData);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const uploadImage = async (uri: string): Promise<Id<"_storage">> => {
    const uploadUrl = await generateUploadUrl();

    const response = await fetch(uri);
    const blob = await response.blob();

    const uploadResult = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": blob.type || "image/jpeg",
      },
      body: blob,
    });

    const { storageId } = await uploadResult.json();
    return storageId;
  };

  const handleUploadDocument = async () => {
    if (!convexUserId || !selectedType || !frontImageUri) {
      Alert.alert("Missing Information", "Please select a document type and upload an image.");
      return;
    }

    setUploading(true);
    try {
      // Upload images
      const frontImageId = await uploadImage(frontImageUri);
      const backImageId = backImageUri
        ? await uploadImage(backImageUri)
        : undefined;

      // Create document record
      const docId = await createDocument({
        userId: convexUserId,
        type: selectedType as any,
        title: title || Config.DOCUMENT_TYPES.find((t) => t.id === selectedType)?.label || "Document",
        frontImageId,
        backImageId,
      });

      // Try AI extraction in background (non-blocking)
      try {
        // Get the image URL for AI processing
        const doc = documents?.find((d) => d._id === docId);
        if (doc?.frontImageUrl) {
          extractDocumentData({
            imageUrl: doc.frontImageUrl,
            documentType: selectedType,
          }).then((metadata) => {
            // Would update the document with extracted metadata
            console.log("AI extraction result:", metadata);
          }).catch(console.error);
        }
      } catch (aiError) {
        console.log("AI extraction skipped:", aiError);
      }

      // Reset form
      setShowUpload(false);
      setSelectedType("");
      setTitle("");
      setFrontImageUri("");
      setBackImageUri("");

      Alert.alert("Success", "Document uploaded successfully!");
    } catch (error: any) {
      console.error("Upload failed:", error);
      Alert.alert("Upload Failed", error?.message || "Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Group documents by type
  const groupedDocs = documents?.reduce<Record<string, NonNullable<typeof documents>>>(
    (acc, doc) => {
      if (!acc[doc.type]) acc[doc.type] = [];
      acc[doc.type].push(doc);
      return acc;
    },
    {}
  );

  return (
    <ScreenWrapper>
      <Header
        title="Identity Wallet"
        subtitle={`${documents?.length ?? 0} documents stored`}
        rightAction={{
          icon: showUpload ? "close" : "add-circle-outline",
          onPress: () => setShowUpload(!showUpload),
        }}
      />

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Upload Form */}
        {showUpload && (
          <GlassCard className="mb-5">
            <Text className="text-white font-semibold text-lg mb-4">
              Add New Document
            </Text>

            {/* Document Type Selection */}
            <Text className="text-white/70 text-sm mb-2">Document Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              {Config.DOCUMENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => {
                    setSelectedType(type.id);
                    setTitle(type.label);
                  }}
                  className={`mr-3 px-4 py-2.5 rounded-xl border ${
                    selectedType === type.id
                      ? "bg-primary/20 border-primary"
                      : "bg-white/5 border-glass-border"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selectedType === type.id
                        ? "text-primary"
                        : "text-white/60"
                    }`}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Image Upload */}
            <DocumentUploader
              label="Front Side"
              imageUri={frontImageUri}
              onImageSelected={setFrontImageUri}
              onRemove={() => setFrontImageUri("")}
            />
            <DocumentUploader
              label="Back Side (Optional)"
              imageUri={backImageUri}
              onImageSelected={setBackImageUri}
              onRemove={() => setBackImageUri("")}
            />

            <GlassButton
              title={uploading ? "Uploading..." : "Upload Document"}
              onPress={handleUploadDocument}
              loading={uploading}
              disabled={!selectedType || !frontImageUri}
              size="lg"
            />
          </GlassCard>
        )}

        {/* Verified Credentials Badge */}
        <GlassCard className="mb-5">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-success/20 items-center justify-center mr-3">
              <Ionicons name="shield-checkmark" size={22} color="#00C853" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold">
                Verified Credentials
              </Text>
              <Text className="text-white/50 text-sm mt-0.5">
                Your identity is secured with LockDigit
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Documents List */}
        {documents && documents.length > 0 ? (
          Object.entries(groupedDocs || {}).map(([type, docs]) => (
            <View key={type} className="mb-5">
              <Text className="text-white/60 text-sm font-medium uppercase tracking-wider mb-2">
                {Config.DOCUMENT_TYPES.find((t) => t.id === type)?.label || type}
              </Text>
              {docs?.map((doc) => (
                <DocumentCard
                  key={doc._id}
                  id={doc._id}
                  title={doc.title}
                  type={doc.type}
                  issuer={doc.issuer}
                  expiryDate={doc.expiryDate}
                  verified={doc.verified}
                  frontImageUrl={doc.frontImageUrl}
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/document/[id]",
                      params: { id: doc._id },
                    })
                  }
                />
              ))}
            </View>
          ))
        ) : (
          <EmptyState
            icon="documents-outline"
            title="No Documents Yet"
            description="Start by uploading your identity documents like driver's license, passport, or vaccination certificate."
            action={
              <GlassButton
                title="Upload Document"
                onPress={() => setShowUpload(true)}
                variant="primary"
                size="md"
              />
            }
          />
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
