import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  Share,
  Platform,
  Modal,
  Pressable,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useConvex, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import QRCode from "react-native-qrcode-svg";
import { EmptyState } from "@/components/common";
import { useFirebaseSessionReady } from "@/hooks/useFirebaseSessionReady";
import { useResolvedDocumentImages } from "@/hooks/useResolvedDocumentImages";
import { Id } from "@/convex/_generated/dataModel";
import { formatDate } from "@/lib/utils";


const typeLabels: Record<string, string> = {
  drivers_license: "Driver's License",
  passport: "Passport",
  vaccination: "Vaccination",
  national_id: "National ID",
  insurance: "Insurance",
  other: "Document",
};

export default function VerifiedCredentialsScreen() {
  const router = useRouter();
  const convex = useConvex();
  const { hasUser: firebaseHasUser } = useFirebaseSessionReady();
  const { width: screenWidth } = useWindowDimensions();

  const [qrDoc, setQrDoc] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshHint, setRefreshHint] = useState(0);

  const user = useQuery(
    api.users.getMe,
    firebaseHasUser ? {} : "skip"
  );
  const verifiedDocs = useQuery(
    api.documents.listVerifiedMine,
    firebaseHasUser ? { _refreshHint: refreshHint } : "skip"
  );
  const { frontImageUris } = useResolvedDocumentImages(verifiedDocs);
  const setMainDocument = useMutation(api.users.setMainDocumentMe);

  const mainDocId = (user as any)?.mainDocumentId as
    | Id<"documents">
    | undefined;

  const handleSetMainId = async (docId: Id<"documents">) => {
    try {
      await setMainDocument({ documentId: docId });
      Alert.alert("Main ID Updated", "This credential is now your main ID and will appear on your dashboard.");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to set main ID.");
    }
  };

  const handleClearMainId = async () => {
    Alert.alert("Remove Main ID", "Remove this credential as your main ID?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await setMainDocument({ documentId: undefined });
            Alert.alert("Done", "Main ID has been removed.");
          } catch (error: unknown) {
            const msg =
              error instanceof Error ? error.message : "Failed to remove main ID.";
            Alert.alert("Error", msg);
          }
        },
      },
    ]);
  };

  const handleShareCredential = async (doc: any) => {
    const text = [
      `Credential: ${doc.title}`,
      `Type: ${typeLabels[doc.type] || doc.type}`,
      doc.issuer ? `Issuer: ${doc.issuer}` : null,
      doc.documentNumber ? `Document #: ${doc.documentNumber}` : null,
      `Status: Verified`,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await Share.share({
        message: text,
        title: "LockDigit – Verified Credential",
      });
    } catch {
      // dismissed
    }
  };

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await convex.query(api.documents.listVerifiedMine, {
        _refreshHint: Date.now(),
      });
      setRefreshHint((h) => h + 1);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to refresh data.";
      Alert.alert("Refresh Failed", msg);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="bg-white border-b border-ios-border px-5 py-3">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-3 p-1"
            >
              <Ionicons name="chevron-back" size={24} color="#0A84FF" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-ios-dark">
                Verified Credentials
              </Text>
              <Text className="text-ios-grey4 text-sm mt-0.5">
                {verifiedDocs?.length ?? 0} verified{" "}
                {(verifiedDocs?.length ?? 0) === 1
                  ? "credential"
                  : "credentials"}
              </Text>
            </View>
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
          {/* Info Banner */}
          <View className="px-5 mt-4 mb-4">
            <View
              className="bg-emerald-50 rounded-3xl p-4 border border-emerald-100"
              style={styles.cardShadow}
            >
              <View className="flex-row items-center mb-2">
                <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center mr-3">
                  <Ionicons
                    name="shield-checkmark"
                    size={22}
                    color="#30D158"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-ios-dark font-semibold">
                    Your Verified IDs
                  </Text>
                  <Text className="text-ios-grey4 text-xs mt-0.5">
                    Only government-verified credentials appear here.
                    Set one as your Main ID to show it on your dashboard.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Credentials List */}
          <View className="px-5">
            {verifiedDocs && verifiedDocs.length > 0 ? (
              verifiedDocs.map((doc) => {
                const isMain = mainDocId === doc._id;
                const displayImageUrl =
                  frontImageUris[doc._id] ?? doc.frontImageUrl;
                return (
                  <View
                    key={doc._id}
                    className={`bg-white rounded-3xl border mb-4 overflow-hidden ${
                      isMain ? "border-emerald-300" : "border-ios-border"
                    }`}
                    style={styles.cardShadow}
                  >
                    {isMain && (
                      <View className="bg-emerald-500 px-4 py-1.5">
                        <View className="flex-row items-center justify-center">
                          <Ionicons name="star" size={14} color="#FFFFFF" />
                          <Text className="text-white text-xs font-semibold ml-1.5">
                            Main ID
                          </Text>
                        </View>
                      </View>
                    )}

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/document/[id]",
                          params: { id: doc._id },
                        })
                      }
                    >
                      <View className="p-4">
                        <View className="flex-row items-start">
                          {displayImageUrl ? (
                            <Image
                              source={{ uri: displayImageUrl }}
                              className="w-20 h-20 rounded-2xl mr-4"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="w-20 h-20 rounded-2xl bg-emerald-50 items-center justify-center mr-4">
                              <Ionicons
                                name="card-outline"
                                size={32}
                                color="#30D158"
                              />
                            </View>
                          )}

                          <View className="flex-1">
                            <View className="flex-row items-center">
                              <Ionicons
                                name="shield-checkmark"
                                size={16}
                                color="#30D158"
                              />
                              <Text className="text-emerald-600 text-xs font-medium ml-1">
                                Verified
                              </Text>
                            </View>
                            <Text
                              className="text-ios-dark font-semibold text-base mt-1"
                              numberOfLines={1}
                            >
                              {doc.title}
                            </Text>
                            <Text className="text-ios-grey4 text-sm mt-0.5">
                              {typeLabels[doc.type] || doc.type}
                              {doc.issuer ? ` · ${doc.issuer}` : ""}
                            </Text>
                            {doc.expiryDate && (
                              <Text className="text-ios-grey3 text-xs mt-1">
                                Expires {formatDate(doc.expiryDate)}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Action Buttons */}
                    <View className="border-t border-ios-border flex-row">
                      <TouchableOpacity
                        onPress={() => setQrDoc(doc)}
                        className="flex-1 flex-row items-center justify-center py-3 border-r border-ios-border"
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="qr-code-outline"
                          size={16}
                          color="#0A84FF"
                        />
                        <Text className="text-primary text-sm font-medium ml-1.5">
                          QR Code
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleShareCredential(doc)}
                        className="flex-1 flex-row items-center justify-center py-3 border-r border-ios-border"
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="share-outline"
                          size={16}
                          color="#5E5CE6"
                        />
                        <Text className="text-[#5E5CE6] text-sm font-medium ml-1.5">
                          Share
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() =>
                          isMain
                            ? handleClearMainId()
                            : handleSetMainId(doc._id)
                        }
                        className="flex-1 flex-row items-center justify-center py-3"
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isMain ? "star" : "star-outline"}
                          size={16}
                          color={isMain ? "#FF9500" : "#30D158"}
                        />
                        <Text
                          className={`text-sm font-medium ml-1.5 ${
                            isMain ? "text-[#FF9500]" : "text-emerald-600"
                          }`}
                        >
                          {isMain ? "Main ID" : "Set Main"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            ) : (
              <EmptyState
                icon="shield-checkmark-outline"
                title="No Verified Credentials"
                description="Once your documents are verified, they will appear here. Upload documents in your Wallet to get started."
              />
            )}
          </View>
        </ScrollView>

        {/* QR Code Modal */}
        <Modal
          visible={!!qrDoc}
          transparent
          animationType="fade"
          onRequestClose={() => setQrDoc(null)}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setQrDoc(null)}
          >
            {Platform.OS === "web" ? (
              <View style={[StyleSheet.absoluteFill, styles.blurFallback]} />
            ) : (
              <BlurView
                intensity={80}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            )}
            <View style={styles.qrModalContent}>
              <View style={styles.qrModalBox}>
                <View className="bg-emerald-50 rounded-full p-2 mb-3">
                  <Ionicons
                    name="shield-checkmark"
                    size={24}
                    color="#30D158"
                  />
                </View>
                <Text className="text-ios-dark font-semibold text-lg mb-1">
                  {qrDoc?.title}
                </Text>
                <Text className="text-emerald-600 text-xs font-medium mb-4">
                  Verified Credential
                </Text>
                {Platform.OS === "web" ? (
                  <Text className="text-ios-grey4">QR in mobile app</Text>
                ) : (
                  <QRCode
                    value={JSON.stringify({
                      type: "verified_credential",
                      title: qrDoc?.title,
                      docType: qrDoc?.type,
                      issuer: qrDoc?.issuer || "",
                      documentNumber: qrDoc?.documentNumber || "",
                      verified: true,
                    })}
                    size={Math.min(screenWidth * 0.6, 240)}
                    backgroundColor="white"
                    color="#1C1C1E"
                  />
                )}
                <Text className="text-ios-grey4 text-sm mt-4 text-center">
                  Scan to verify this credential
                </Text>
              </View>
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  qrModalContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  qrModalBox: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "85%",
  },
  blurFallback: {
    backgroundColor: "rgba(0,0,0,0.5)",
  },
});
