import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StyleSheet,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassButton } from "@/components/glass";
import { DocumentCard, DocumentUploader } from "@/components/documents";
import { EmptyState } from "@/components/common";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import { Config } from "@/constants/Config";

type TabType = "documents" | "payments";

export default function WalletScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;

  const [activeTab, setActiveTab] = useState<TabType>("documents");
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
      headers: { "Content-Type": blob.type || "image/jpeg" },
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
      const frontImageId = await uploadImage(frontImageUri);
      const backImageId = backImageUri ? await uploadImage(backImageUri) : undefined;

      const docId = await createDocument({
        userId: convexUserId,
        type: selectedType as any,
        title: title || Config.DOCUMENT_TYPES.find((t) => t.id === selectedType)?.label || "Document",
        frontImageId,
        backImageId,
      });

      try {
        const doc = documents?.find((d) => d._id === docId);
        if (doc?.frontImageUrl) {
          extractDocumentData({
            imageUrl: doc.frontImageUrl,
            documentType: selectedType,
          }).then((metadata) => {
            console.log("AI extraction result:", metadata);
          }).catch(console.error);
        }
      } catch (aiError) {
        console.log("AI extraction skipped:", aiError);
      }

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

  const groupedDocs = documents?.reduce<Record<string, NonNullable<typeof documents>>>(
    (acc, doc) => {
      if (!acc[doc.type]) acc[doc.type] = [];
      acc[doc.type].push(doc);
      return acc;
    },
    {}
  );

  const verifiedCount = documents?.filter((d) => d.verified).length ?? 0;

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="bg-white border-b border-ios-border px-5 py-3">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-ios-dark">
                Identity Wallet
              </Text>
              <Text className="text-ios-grey4 text-sm mt-0.5">
                {documents?.length ?? 0} documents stored
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowUpload(true)}
              className="w-10 h-10 rounded-full bg-primary items-center justify-center"
              style={styles.addShadow}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Blockchain Status Card */}
          <View className="px-5 mt-4 mb-4">
            <View
              className="bg-ios-dark rounded-3xl p-5 overflow-hidden"
              style={styles.darkCardShadow}
            >
              <View className="absolute top-3 right-3 w-20 h-20 rounded-2xl bg-white/5 rotate-12" />
              <View className="flex-row items-center mb-3">
                <Ionicons name="shield-checkmark" size={22} color="#30D158" />
                <Text className="text-white font-semibold ml-2">
                  Blockchain Secured
                </Text>
              </View>
              <Text className="text-white/60 text-sm">
                Your identity documents are secured on the blockchain.
                {verifiedCount > 0
                  ? ` ${verifiedCount} document${verifiedCount > 1 ? "s" : ""} verified.`
                  : " Upload documents to get started."}
              </Text>
            </View>
          </View>

          {/* Tab Switcher */}
          <View className="flex-row mx-5 mb-4 bg-ios-bg rounded-xl p-1 border border-ios-border">
            <TouchableOpacity
              onPress={() => setActiveTab("documents")}
              className={`flex-1 py-2.5 rounded-lg ${
                activeTab === "documents" ? "bg-white" : ""
              }`}
              style={activeTab === "documents" ? styles.tabShadow : undefined}
            >
              <Text
                className={`text-center font-semibold text-sm ${
                  activeTab === "documents" ? "text-ios-dark" : "text-ios-grey4"
                }`}
              >
                Documents
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("payments")}
              className={`flex-1 py-2.5 rounded-lg ${
                activeTab === "payments" ? "bg-white" : ""
              }`}
              style={activeTab === "payments" ? styles.tabShadow : undefined}
            >
              <Text
                className={`text-center font-semibold text-sm ${
                  activeTab === "payments" ? "text-ios-dark" : "text-ios-grey4"
                }`}
              >
                Payment Assets
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "documents" && (
            <View className="px-5">
              {documents && documents.length > 0 ? (
                Object.entries(groupedDocs || {}).map(([type, docs]) => (
                  <View key={type} className="mb-5">
                    <Text className="text-ios-grey4 text-xs font-semibold uppercase tracking-wider mb-2">
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
                  description="Start by uploading your identity documents."
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
            </View>
          )}

          {activeTab === "payments" && (
            <View className="px-5">
              <View
                className="bg-white rounded-3xl border border-ios-border p-5"
                style={styles.cardShadow}
              >
                <View className="items-center py-6">
                  <Ionicons name="card-outline" size={48} color="#C7C7CC" />
                  <Text className="text-ios-dark font-semibold text-base mt-3">
                    Payment Assets
                  </Text>
                  <Text className="text-ios-grey4 text-sm mt-1 text-center">
                    Add bank accounts and credit cards{"\n"}for seamless payments
                  </Text>
                  <TouchableOpacity className="bg-primary rounded-2xl px-6 py-3 mt-4" style={styles.buttonShadow}>
                    <Text className="text-white font-semibold text-sm">
                      Add Payment Method
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Upload Modal */}
        <Modal
          visible={showUpload}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View className="flex-1 bg-ios-bg">
            <SafeAreaView className="flex-1">
              {/* Modal Header */}
              <View className="flex-row items-center justify-between px-5 py-3 bg-white border-b border-ios-border">
                <TouchableOpacity onPress={() => setShowUpload(false)}>
                  <Text className="text-primary text-base">Cancel</Text>
                </TouchableOpacity>
                <Text className="text-ios-dark font-semibold text-base">
                  Add Document
                </Text>
                <View className="w-14" />
              </View>

              <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
                {/* Document Type Selection */}
                <Text className="text-ios-dark font-semibold text-base mb-3">
                  Document Type
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-5"
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
                          ? "bg-primary/10 border-primary"
                          : "bg-white border-ios-border"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          selectedType === type.id
                            ? "text-primary"
                            : "text-ios-grey4"
                        }`}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Add Methods */}
                <View className="mb-5">
                  {[
                    { icon: "cloud-upload-outline", label: "Upload from Gallery", desc: "Choose an existing photo" },
                    { icon: "camera-outline", label: "Scan Document", desc: "Take a photo of your document" },
                    { icon: "globe-outline", label: "Retrieve from Web", desc: "Import from government portal" },
                  ].map((method) => (
                    <TouchableOpacity
                      key={method.label}
                      className="flex-row items-center bg-white rounded-2xl border border-ios-border p-4 mb-3"
                      style={styles.cardShadow}
                    >
                      <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center mr-3">
                        <Ionicons name={method.icon as any} size={24} color="#0A84FF" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-ios-dark font-medium text-base">
                          {method.label}
                        </Text>
                        <Text className="text-ios-grey4 text-sm mt-0.5">
                          {method.desc}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                    </TouchableOpacity>
                  ))}
                </View>

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
                  fullWidth
                  className="mb-8"
                />
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  addShadow: {
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  darkCardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  tabShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonShadow: {
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
});
