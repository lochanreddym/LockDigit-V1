import React, { useState, useCallback, useMemo } from "react";
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
  Share,
  Dimensions,
  TextInput,
  ActionSheetIOS,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAction, useConvex, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/components/common";
import { useLocalSearchParams, useRouter } from "expo-router";
import { DOCUMENT_CATEGORIES } from "@/constants/documentCategories";
import { useFirebaseSessionReady } from "@/hooks/useFirebaseSessionReady";
import { useResolvedDocumentImages } from "@/hooks/useResolvedDocumentImages";
import { useVerificationRecheck } from "@/hooks/useVerificationRecheck";
import {
  encryptDocumentBlob,
  resolveDocumentImageUri,
} from "@/lib/document-encryption";
import { formatDate } from "@/lib/utils";

const VERIFIABLE_DOC_TYPES = ["drivers_license", "passport", "national_id"];

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function WalletScreen() {
  const router = useRouter();
  const convex = useConvex();
  const firebaseSessionReady = useFirebaseSessionReady();
  const params = useLocalSearchParams<{
    addDocType?: string;
    addDocLabel?: string;
    addDocState?: string;
  }>();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [refreshHint, setRefreshHint] = useState(0);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [viewerClosing, setViewerClosing] = useState(false);

  const documents = useQuery(
    api.documents.listMine,
    firebaseSessionReady ? { _refreshHint: refreshHint } : "skip"
  );
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);
  const updateDocument = useMutation(api.documents.update);
  const removeDocument = useMutation(api.documents.remove);
  const anchorDocumentHash = useAction(api.blockchain.anchorDocumentHash);

  const { frontImageUris, backImageUris } =
    useResolvedDocumentImages(documents);

  useVerificationRecheck(documents ?? undefined);

  const displayDocuments = useMemo(
    () =>
      documents?.map((doc) => ({
        ...doc,
        frontDisplayUrl: frontImageUris[doc._id] ?? doc.frontImageUrl ?? null,
        backDisplayUrl: backImageUris[doc._id] ?? doc.backImageUrl ?? null,
      })) ?? [],
    [documents, frontImageUris, backImageUris]
  );

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await convex.query(api.documents.listMine, { _refreshHint: Date.now() });
      setRefreshHint((h) => h + 1);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to refresh wallet data.";
      Alert.alert("Refresh Failed", msg);
    } finally {
      setRefreshing(false);
    }
  }, [convex, refreshing]);

  const uploadImage = async (
    uri: string
  ): Promise<{
    storageId: Id<"_storage">;
    contentHash: string;
    mimeType: string;
    encryptionVersion: number;
  }> => {
    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch image: ${response.status} ${response.statusText}`
      );
    }
    const blob = await response.blob();
    const encryptedPayload = await encryptDocumentBlob(blob);
    const uploadResult = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: encryptedPayload.encryptedBlob,
    });
    if (!uploadResult.ok) {
      throw new Error("Failed to upload encrypted document.");
    }
    const { storageId } = await uploadResult.json();
    return {
      storageId,
      contentHash: encryptedPayload.contentHash,
      mimeType: encryptedPayload.mimeType,
      encryptionVersion: encryptedPayload.encryptionVersion,
    };
  };

  const requestPermission = async (type: "camera" | "gallery") => {
    if (type === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === "granted";
    }
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === "granted";
  };

  const pickFromGallery = async () => {
    const granted = await requestPermission("gallery");
    if (!granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library in Settings."
      );
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setPreviewUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Failed to open gallery. Please try again.");
    }
  };

  const pickFromCamera = async () => {
    const granted = await requestPermission("camera");
    if (!granted) {
      Alert.alert(
        "Permission Required",
        "Please allow camera access in Settings."
      );
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setPreviewUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Failed to open camera. Please try again.");
    }
  };

  const pickFromFiles = async () => {
    try {
      const DocumentPicker = await import("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        setPreviewUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error("Document picker error:", err);
      Alert.alert(
        "Files Unavailable",
        "Files not available. Please use Gallery or Camera to add documents."
      );
    }
  };

  const showAddOptions = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Gallery", "Camera", "Files"],
          cancelButtonIndex: 0,
          title: "Add Document",
          message: "Choose how to upload your document",
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickFromGallery();
          else if (buttonIndex === 2) pickFromCamera();
          else if (buttonIndex === 3) pickFromFiles();
        }
      );
    } else {
      Alert.alert("Add Document", "Choose how to upload your document", [
        { text: "Gallery", onPress: pickFromGallery },
        { text: "Camera", onPress: pickFromCamera },
        { text: "Files", onPress: pickFromFiles },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const handleUseThis = async () => {
    if (!previewUri) return;
    setUploading(true);
    try {
      const {
        storageId: frontImageId,
        contentHash,
        mimeType,
        encryptionVersion,
      } = await uploadImage(previewUri);

      const selectedType = (params.addDocType || "other").toLowerCase();
      const selectedLabel = params.addDocLabel?.trim();
      const selectedState = params.addDocState?.trim().toUpperCase();
      const categoryMatch = DOCUMENT_CATEGORIES.find((category) =>
        category.subSections.some((section) =>
          section.items.some((item) => item.id === selectedType)
        )
      );

      const documentId = await createDocument({
        documentTypeId: selectedType,
        type: selectedType,
        categoryId: categoryMatch?.id,
        jurisdictionCode: selectedState,
        title: selectedLabel || `Document ${(documents?.length ?? 0) + 1}`,
        frontImageId,
        frontMimeType: mimeType,
        encrypted: true,
        encryptionVersion,
        contentHash,
      });

      let uploadMessage =
        "Encrypted document added to your wallet successfully.";
      try {
        const anchorResult = await anchorDocumentHash({
          documentId,
          contentHash,
        });
        if (anchorResult.anchored) {
          uploadMessage =
            "Encrypted document uploaded and anchored on blockchain.";
        } else if (anchorResult.reason) {
          uploadMessage = `${uploadMessage} ${anchorResult.reason}`;
        } else {
          uploadMessage = `${uploadMessage} Blockchain anchor is pending.`;
        }
      } catch {
        uploadMessage = `${uploadMessage} Blockchain anchor failed for now; you can retry later.`;
      }

      setPreviewUri(null);
      Alert.alert("Uploaded", uploadMessage);
    } catch (error: any) {
      Alert.alert("Upload Failed", error?.message || "Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRename = async (docId: string) => {
    if (!editTitle.trim()) {
      Alert.alert("Invalid", "Please enter a document name.");
      return;
    }
    try {
      await updateDocument({
        documentId: docId as Id<"documents">,
        title: editTitle.trim(),
      });
      setEditingDocId(null);
      setEditTitle("");
    } catch {
      Alert.alert("Error", "Failed to rename document.");
    }
  };

  const handleShare = async (doc: any) => {
    try {
      const shareUri =
        doc.frontDisplayUrl ||
        (await resolveDocumentImageUri({
          storageUrl: doc.frontImageUrl,
          encrypted: doc.encrypted,
          mimeType: doc.frontMimeType,
        }));

      const parts = [
        `Document: ${doc.title}`,
        doc.issuer ? `Issuer: ${doc.issuer}` : null,
        doc.verified ? "Status: Verified" : "Status: Unverified",
      ].filter(Boolean);
      await Share.share({
        message: parts.join("\n"),
        title: `LockDigit – ${doc.title}`,
        url: shareUri || undefined,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg && !/cancel|dismiss/i.test(msg)) {
        console.error("Share error:", err);
      }
    }
  };

  const handleDelete = (
    docId: string,
    title: string,
    onSuccess?: () => void
  ) => {
    Alert.alert("Delete Document", `Delete "${title}" permanently?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await removeDocument({ documentId: docId as Id<"documents"> });
            onSuccess?.();
          } catch (error: unknown) {
            const msg =
              error instanceof Error ? error.message : "Failed to delete.";
            Alert.alert("Error", msg);
          }
        },
      },
    ]);
  };

  const startEditing = (docId: string, currentTitle: string) => {
    setEditingDocId(docId);
    setEditTitle(currentTitle);
  };

  const openViewer = (doc: any) => {
    if (viewerClosing) return;
    setViewingDoc(doc);
  };

  const closeViewer = () => {
    setViewerClosing(true);
    setViewingDoc(null);
    setTimeout(() => setViewerClosing(false), 250);
  };

  const totalCount = documents?.length ?? 0;
  const verifiedCount = documents?.filter((d) => d.verified).length ?? 0;
  const unverifiedCount = totalCount - verifiedCount;

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
                {totalCount} documents stored
              </Text>
            </View>
            <TouchableOpacity
              onPress={showAddOptions}
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
          {/* Status Card */}
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

          {/* Quick Stats */}
          <View className="px-5 mb-4">
            <View className="flex-row" style={{ gap: 10 }}>
              {[
                { label: "Total", value: totalCount, color: "#0A84FF" },
                { label: "Verified", value: verifiedCount, color: "#30D158" },
                { label: "Unverified", value: unverifiedCount, color: "#FF9500" },
              ].map((stat) => (
                <View
                  key={stat.label}
                  className="flex-1 bg-white rounded-2xl border border-ios-border px-3 py-2.5"
                  style={styles.cardShadow}
                >
                  <Text className="text-ios-grey4 text-[11px]">{stat.label}</Text>
                  <Text
                    className="text-base font-semibold mt-0.5"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Documents List */}
          <View className="px-5">
            <View className="mb-2 px-0.5">
              <Text className="text-ios-dark text-lg font-semibold">
                Your Documents
              </Text>
              <Text className="text-ios-grey4 text-xs mt-0.5">
                Tap any document to view it full screen
              </Text>
            </View>
            {displayDocuments.length > 0 ? (
              displayDocuments.map((doc) => (
                <View
                  key={doc._id}
                  className="bg-white rounded-3xl border border-ios-border mb-3 overflow-hidden"
                  style={styles.cardShadow}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => openViewer(doc)}
                  >
                    <View className="p-4">
                      <View className="flex-row items-center">
                        {doc.frontDisplayUrl ? (
                          <Image
                            source={{ uri: doc.frontDisplayUrl }}
                            className="w-16 h-16 rounded-xl mr-4"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="w-16 h-16 rounded-xl bg-primary/10 items-center justify-center mr-4">
                            <Ionicons
                              name="document-outline"
                              size={28}
                              color="#0A84FF"
                            />
                          </View>
                        )}

                        <View className="flex-1">
                          {editingDocId === doc._id ? (
                            <View className="flex-row items-center">
                              <TextInput
                                value={editTitle}
                                onChangeText={setEditTitle}
                                className="flex-1 text-ios-dark font-semibold text-base border-b border-primary pb-1"
                                autoFocus
                                onSubmitEditing={() => handleRename(doc._id)}
                                returnKeyType="done"
                              />
                              <TouchableOpacity
                                onPress={() => handleRename(doc._id)}
                                className="ml-2 p-1"
                              >
                                <Ionicons
                                  name="checkmark-circle"
                                  size={24}
                                  color="#30D158"
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => {
                                  setEditingDocId(null);
                                  setEditTitle("");
                                }}
                                className="ml-1 p-1"
                              >
                                <Ionicons
                                  name="close-circle"
                                  size={24}
                                  color="#FF3B30"
                                />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <View className="flex-row items-center">
                              <Text
                                className="text-ios-dark font-semibold text-base flex-1"
                                numberOfLines={1}
                              >
                                {doc.title}
                              </Text>
                              {doc.verified && (
                                <View className="bg-emerald-50 px-2 py-0.5 rounded-full ml-2">
                                  <Text className="text-emerald-600 text-xs font-medium">
                                    Verified
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                          <Text className="text-ios-grey4 text-sm mt-1">
                            {doc.type.replace(/_/g, " ")}
                            {doc.issuer ? ` · ${doc.issuer}` : ""}
                          </Text>
                          <Text className="text-ios-grey3 text-xs mt-0.5">
                            Added {formatDate(doc.createdAt)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Action buttons */}
                  <View className="border-t border-ios-border flex-row">
                    <TouchableOpacity
                      onPress={() => startEditing(doc._id, doc.title)}
                      className="flex-1 flex-row items-center justify-center py-2.5 border-r border-ios-border"
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="pencil-outline"
                        size={15}
                        color="#0A84FF"
                      />
                      <Text className="text-primary text-xs font-medium ml-1.5">
                        Rename
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleShare(doc)}
                      className="flex-1 flex-row items-center justify-center py-2.5 border-r border-ios-border"
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="share-outline"
                        size={15}
                        color="#5E5CE6"
                      />
                      <Text className="text-[#5E5CE6] text-xs font-medium ml-1.5">
                        Share
                      </Text>
                    </TouchableOpacity>

                    {VERIFIABLE_DOC_TYPES.includes(doc.type) && !doc.verified && (
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: "/(app)/verify-document",
                            params: { id: doc._id },
                          })
                        }
                        className="flex-1 flex-row items-center justify-center py-2.5 border-r border-ios-border"
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={15}
                          color="#30D158"
                        />
                        <Text className="text-emerald-600 text-xs font-medium ml-1.5">
                          Verify
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() => handleDelete(doc._id, doc.title)}
                      className="flex-1 flex-row items-center justify-center py-2.5"
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={15}
                        color="#FF3B30"
                      />
                      <Text className="text-[#FF3B30] text-xs font-medium ml-1.5">
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <EmptyState
                icon="documents-outline"
                title="No Documents Yet"
                description="Tap the + button to add documents from your gallery, camera, or files."
              />
            )}
          </View>
        </ScrollView>

        {/* Preview / Confirmation Modal */}
        <Modal
          visible={!!previewUri}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => !uploading && setPreviewUri(null)}
        >
          <View className="flex-1 bg-ios-bg">
            <SafeAreaView className="flex-1">
              <View className="flex-row items-center justify-between px-5 py-3 bg-white border-b border-ios-border">
                <TouchableOpacity
                  onPress={() => !uploading && setPreviewUri(null)}
                  disabled={uploading}
                >
                  <Text
                    className={`text-base ${uploading ? "text-ios-grey3" : "text-primary"}`}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <Text className="text-ios-dark font-semibold text-base">
                  Confirm Document
                </Text>
                <View className="w-14" />
              </View>

              <View className="flex-1 justify-center items-center px-5">
                {previewUri && (
                  <View
                    className="bg-white rounded-3xl border border-ios-border overflow-hidden"
                    style={styles.previewShadow}
                  >
                    <Image
                      source={{ uri: previewUri }}
                      style={{
                        width: SCREEN_WIDTH - 60,
                        height: (SCREEN_WIDTH - 60) * 0.75,
                      }}
                      resizeMode="contain"
                    />
                  </View>
                )}

                <Text className="text-ios-grey4 text-sm mt-5 text-center">
                  Does this look correct?
                </Text>

                <View className="flex-row gap-4 mt-6 w-full px-4">
                  <TouchableOpacity
                    onPress={() => !uploading && setPreviewUri(null)}
                    disabled={uploading}
                    className="flex-1 py-3.5 rounded-2xl bg-white border border-ios-border items-center"
                    activeOpacity={0.8}
                  >
                    <Text className="text-ios-dark font-semibold">Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleUseThis}
                    disabled={uploading}
                    className="flex-1 py-3.5 rounded-2xl bg-primary items-center"
                    style={styles.useShadow}
                    activeOpacity={0.8}
                  >
                    {uploading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text className="text-white font-semibold">Use This</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          </View>
        </Modal>

        {/* In-App Document Viewer Modal */}
        <Modal
          visible={!!viewingDoc}
          animationType="fade"
          presentationStyle="fullScreen"
          onRequestClose={closeViewer}
        >
          <View className="flex-1 bg-black">
            <View
              className="flex-1"
              style={{
                paddingTop: insets.top + 8,
                paddingBottom: Math.max(insets.bottom, 12),
              }}
            >
              {/* Viewer Header */}
              <View className="flex-row items-center justify-between px-5 py-2.5">
                <TouchableOpacity
                  onPress={closeViewer}
                  hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
                  className="w-11 h-11 rounded-full bg-white/10 items-center justify-center"
                >
                  <Ionicons name="close" size={26} color="#FFFFFF" />
                </TouchableOpacity>
                <Text
                  className="text-white font-semibold text-base flex-1 text-center"
                  numberOfLines={1}
                >
                  {viewingDoc?.title}
                </Text>
                <View className="w-10 h-10" />
              </View>

              {/* Document Image */}
              <View className="flex-1 justify-center items-center px-4">
                {viewingDoc?.frontDisplayUrl || viewingDoc?.frontImageUrl ? (
                  <Image
                    source={{
                      uri:
                        viewingDoc.frontDisplayUrl || viewingDoc.frontImageUrl,
                    }}
                    style={{
                      width: SCREEN_WIDTH - 32,
                      height: (SCREEN_WIDTH - 32) * 0.8,
                    }}
                    resizeMode="contain"
                  />
                ) : (
                  <View className="items-center">
                    <Ionicons
                      name="document-outline"
                      size={64}
                      color="#666"
                    />
                    <Text className="text-white/60 mt-3">
                      No image available
                    </Text>
                  </View>
                )}
              </View>

              {/* Doc Info Footer */}
              <View className="bg-white/10 rounded-t-3xl px-5 pt-5 pb-8">
                <View className="flex-row items-center mb-3">
                  {viewingDoc?.verified ? (
                    <View className="flex-row items-center bg-emerald-500/20 px-3 py-1.5 rounded-full">
                      <Ionicons
                        name="shield-checkmark"
                        size={14}
                        color="#30D158"
                      />
                      <Text className="text-emerald-400 text-xs font-semibold ml-1">
                        Verified
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center bg-orange-500/20 px-3 py-1.5 rounded-full">
                      <Ionicons
                        name="shield-half-outline"
                        size={14}
                        color="#FF9500"
                      />
                      <Text className="text-orange-400 text-xs font-semibold ml-1">
                        Unverified
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-white font-semibold text-lg">
                  {viewingDoc?.title}
                </Text>
                <Text className="text-white/60 text-sm mt-1">
                  {viewingDoc?.type?.replace(/_/g, " ")}
                  {viewingDoc?.issuer ? ` · ${viewingDoc.issuer}` : ""}
                </Text>
                {viewingDoc?.createdAt && (
                  <Text className="text-white/40 text-xs mt-1">
                    Added {formatDate(viewingDoc.createdAt)}
                  </Text>
                )}

                {/* Viewer Actions */}
                <View className="flex-row gap-3 mt-4">
                  <TouchableOpacity
                    onPress={() => {
                      if (viewingDoc) {
                        startEditing(viewingDoc._id, viewingDoc.title);
                        closeViewer();
                      }
                    }}
                    className="flex-1 flex-row items-center justify-center py-3 rounded-2xl bg-white/10"
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="pencil-outline"
                      size={16}
                      color="#FFFFFF"
                    />
                    <Text className="text-white text-sm font-medium ml-2">
                      Rename
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      if (viewingDoc) handleShare(viewingDoc);
                    }}
                    className="flex-1 flex-row items-center justify-center py-3 rounded-2xl bg-white/10"
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="share-outline"
                      size={16}
                      color="#FFFFFF"
                    />
                    <Text className="text-white text-sm font-medium ml-2">
                      Share
                    </Text>
                  </TouchableOpacity>

                  {viewingDoc &&
                    VERIFIABLE_DOC_TYPES.includes(viewingDoc.type) &&
                    !viewingDoc.verified && (
                      <TouchableOpacity
                        onPress={() => {
                          if (viewingDoc) {
                            closeViewer();
                            router.push({
                              pathname: "/(app)/verify-document",
                              params: { id: viewingDoc._id },
                            });
                          }
                        }}
                        className="flex-1 flex-row items-center justify-center py-3 rounded-2xl bg-emerald-500/20"
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={16}
                          color="#30D158"
                        />
                        <Text className="text-emerald-400 text-sm font-medium ml-2">
                          Verify
                        </Text>
                      </TouchableOpacity>
                    )}

                  <TouchableOpacity
                    onPress={() => {
                      if (viewingDoc) {
                        handleDelete(viewingDoc._id, viewingDoc.title, () =>
                          closeViewer()
                        );
                      }
                    }}
                    className="flex-row items-center justify-center py-3 px-5 rounded-2xl bg-red-500/20"
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color="#FF3B30"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
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
  previewShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  useShadow: {
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
