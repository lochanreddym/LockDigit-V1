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
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassButton } from "@/components/glass";
import { DocumentCard } from "@/components/documents";
import { EmptyState } from "@/components/common";
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

  const pickImage = async (useCamera: boolean) => {
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
        aspect: [16, 10],
      };
      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        if (!frontImageUri) setFrontImageUri(uri);
        else setBackImageUri(uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const showUploadOptions = () => {
    Alert.alert("Upload", "Choose a source", [
      { text: "Gallery", onPress: () => pickImage(false) },
      { text: "Camera", onPress: () => pickImage(true) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

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

          {/* Documents list */}
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
                description="Tap the + button above to add your identity documents."
              />
            )}
          </View>
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

              <ScrollView
                className="flex-1 px-5 pt-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 72 }}
              >
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

                {/* Minimal previews when images selected (no default placeholders) */}
                {(frontImageUri || backImageUri) ? (
                  <View className="flex-row gap-3 mb-5">
                    <View className="flex-1">
                      <Text className="text-ios-grey4 text-xs font-medium mb-1">Front</Text>
                      {frontImageUri ? (
                        <View className="relative rounded-xl overflow-hidden aspect-[16/10] bg-ios-bg">
                          <Image source={{ uri: frontImageUri }} className="w-full h-full" resizeMode="cover" />
                          <TouchableOpacity
                            onPress={() => setFrontImageUri("")}
                            className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
                          >
                            <Ionicons name="close" size={14} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View className="rounded-xl border border-dashed border-ios-border aspect-[16/10] bg-ios-bg items-center justify-center">
                          <Text className="text-ios-grey4 text-xs">Empty</Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-ios-grey4 text-xs font-medium mb-1">Back (optional)</Text>
                      {backImageUri ? (
                        <View className="relative rounded-xl overflow-hidden aspect-[16/10] bg-ios-bg">
                          <Image source={{ uri: backImageUri }} className="w-full h-full" resizeMode="cover" />
                          <TouchableOpacity
                            onPress={() => setBackImageUri("")}
                            className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
                          >
                            <Ionicons name="close" size={14} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View className="rounded-xl border border-dashed border-ios-border aspect-[16/10] bg-ios-bg items-center justify-center">
                          <Text className="text-ios-grey4 text-xs">Empty</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ) : null}

                <GlassButton
                  title={uploading ? "Uploading..." : "Upload Document"}
                  onPress={handleUploadDocument}
                  loading={uploading}
                  disabled={!selectedType || !frontImageUri}
                  size="lg"
                  fullWidth
                  className="mb-4"
                />
              </ScrollView>

              {/* Minimal upload button: bottom centered */}
              <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-ios-bg items-center">
                <TouchableOpacity
                  onPress={showUploadOptions}
                  className="flex-row items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-ios-border"
                  style={styles.cardShadow}
                  activeOpacity={0.7}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="#0A84FF" />
                  <Text className="text-ios-dark text-sm font-medium">Upload</Text>
                </TouchableOpacity>
              </View>
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
