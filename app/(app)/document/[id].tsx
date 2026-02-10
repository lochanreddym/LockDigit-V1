import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassButton } from "@/components/glass";
import { formatDate, getDaysUntil } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";

const { width } = Dimensions.get("window");

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showFront, setShowFront] = useState(true);
  const [extracting, setExtracting] = useState(false);

  const documentId = id as Id<"documents">;
  const document = useQuery(api.documents.getById, { documentId });
  const removeDocument = useMutation(api.documents.remove);
  const updateDocument = useMutation(api.documents.update);
  const extractDocumentData = useAction(api.ai.extractDocumentData);

  if (!document) {
    return (
      <View className="flex-1 bg-ios-bg">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center px-5 py-3 bg-white border-b border-ios-border">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
              <Ionicons name="chevron-back" size={24} color="#0A84FF" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-ios-dark">Document</Text>
          </View>
          <View className="flex-1 items-center justify-center">
            <Text className="text-ios-grey4">Loading document...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const daysUntilExpiry = document.expiryDate
    ? getDaysUntil(document.expiryDate)
    : null;

  const handleDelete = () => {
    Alert.alert(
      "Delete Document",
      "Are you sure you want to permanently delete this document?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await removeDocument({ documentId });
            router.back();
          },
        },
      ]
    );
  };

  const handleExtract = async () => {
    if (!document.frontImageUrl) return;
    setExtracting(true);
    try {
      const metadata = await extractDocumentData({
        imageUrl: document.frontImageUrl,
        documentType: document.type,
      });

      await updateDocument({
        documentId,
        metadata,
        documentNumber: metadata.documentNumber || document.documentNumber,
        issuer: metadata.issuer || document.issuer,
      });

      Alert.alert("Success", "Document data has been extracted and saved.");
    } catch (error: any) {
      Alert.alert(
        "Extraction Failed",
        "Could not extract data from this document."
      );
    } finally {
      setExtracting(false);
    }
  };

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-3 bg-white border-b border-ios-border">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
              <Ionicons name="chevron-back" size={24} color="#0A84FF" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-ios-dark" numberOfLines={1}>
              {document.title}
            </Text>
          </View>
          <TouchableOpacity onPress={handleDelete} className="p-2">
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Document Image */}
          {document.frontImageUrl && (
            <View className="mb-5">
              <View className="overflow-hidden rounded-3xl border border-ios-border" style={styles.cardShadow}>
                <Image
                  source={{
                    uri: showFront
                      ? document.frontImageUrl
                      : document.backImageUrl || document.frontImageUrl,
                  }}
                  style={{ width: width - 40, height: (width - 40) * 0.63 }}
                  resizeMode="cover"
                />
              </View>
              {document.backImageUrl && (
                <View className="flex-row justify-center mt-3 gap-3">
                  <TouchableOpacity
                    onPress={() => setShowFront(true)}
                    className={`px-4 py-2 rounded-full ${
                      showFront ? "bg-primary" : "bg-white border border-ios-border"
                    }`}
                  >
                    <Text
                      className={showFront ? "text-white text-sm" : "text-ios-grey4 text-sm"}
                    >
                      Front
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowFront(false)}
                    className={`px-4 py-2 rounded-full ${
                      !showFront ? "bg-primary" : "bg-white border border-ios-border"
                    }`}
                  >
                    <Text
                      className={!showFront ? "text-white text-sm" : "text-ios-grey4 text-sm"}
                    >
                      Back
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Verification Status */}
          <View
            className="bg-white rounded-3xl border border-ios-border p-4 mb-4"
            style={styles.cardShadow}
          >
            <View className="flex-row items-center">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{
                  backgroundColor: document.verified
                    ? "rgba(48, 209, 88, 0.12)"
                    : "rgba(255, 149, 0, 0.12)",
                }}
              >
                <Ionicons
                  name={
                    document.verified
                      ? "shield-checkmark"
                      : "shield-half-outline"
                  }
                  size={22}
                  color={document.verified ? "#30D158" : "#FF9500"}
                />
              </View>
              <View className="flex-1">
                <Text className="text-ios-dark font-semibold">
                  {document.verified
                    ? "Verified Credential"
                    : "Pending Verification"}
                </Text>
                <Text className="text-ios-grey4 text-sm mt-0.5">
                  {document.verified
                    ? "This document has been verified"
                    : "Verification may take up to 24 hours"}
                </Text>
              </View>
            </View>
          </View>

          {/* Document Details */}
          <View
            className="bg-white rounded-3xl border border-ios-border p-5 mb-4"
            style={styles.cardShadow}
          >
            <Text className="text-ios-dark font-semibold text-lg mb-4">
              Details
            </Text>

            {[
              { label: "Type", value: document.type.replace(/_/g, " ") },
              { label: "Document Number", value: document.documentNumber },
              { label: "Issuer", value: document.issuer },
              {
                label: "Expiry Date",
                value: document.expiryDate
                  ? formatDate(document.expiryDate)
                  : null,
              },
              {
                label: "Added",
                value: formatDate(document.createdAt),
              },
            ]
              .filter((item) => item.value)
              .map((item) => (
                <View
                  key={item.label}
                  className="flex-row items-center justify-between py-3 border-b border-ios-border"
                >
                  <Text className="text-ios-grey4 text-sm">{item.label}</Text>
                  <Text className="text-ios-dark text-sm font-medium capitalize">
                    {item.value}
                  </Text>
                </View>
              ))}

            {daysUntilExpiry !== null && daysUntilExpiry <= 30 && (
              <View
                className={`mt-3 p-3 rounded-xl ${
                  daysUntilExpiry <= 0 ? "bg-danger/10" : "bg-warning/10"
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="warning"
                    size={18}
                    color={daysUntilExpiry <= 0 ? "#FF3B30" : "#FF9500"}
                  />
                  <Text
                    className={`ml-2 text-sm font-medium ${
                      daysUntilExpiry <= 0 ? "text-danger" : "text-warning"
                    }`}
                  >
                    {daysUntilExpiry <= 0
                      ? "This document has expired"
                      : `Expires in ${daysUntilExpiry} days`}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* AI Extracted Metadata */}
          {document.metadata && (
            <View
              className="bg-white rounded-3xl border border-ios-border p-5 mb-4"
              style={styles.cardShadow}
            >
              <Text className="text-ios-dark font-semibold text-lg mb-3">
                Extracted Information
              </Text>
              {Object.entries(document.metadata as Record<string, any>)
                .filter(
                  ([key, value]) => value && key !== "raw" && typeof value === "string"
                )
                .map(([key, value]) => (
                  <View
                    key={key}
                    className="flex-row items-center justify-between py-2 border-b border-ios-border"
                  >
                    <Text className="text-ios-grey4 text-sm capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </Text>
                    <Text className="text-ios-dark text-sm font-medium">
                      {String(value)}
                    </Text>
                  </View>
                ))}
            </View>
          )}

          {/* AI Extract Button */}
          {!document.metadata && document.frontImageUrl && (
            <GlassButton
              title={extracting ? "Extracting..." : "Extract Data with AI"}
              onPress={handleExtract}
              loading={extracting}
              variant="secondary"
              size="lg"
              icon={
                <Ionicons name="sparkles" size={18} color="#0A84FF" />
              }
              className="mb-4"
              fullWidth
            />
          )}
        </ScrollView>
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
});
