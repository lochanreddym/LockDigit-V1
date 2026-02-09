import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ScreenWrapper, Header } from "@/components/common";
import { GlassCard, GlassButton } from "@/components/glass";
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
      <ScreenWrapper>
        <Header title="Document" showBack />
        <View className="flex-1 items-center justify-center">
          <Text className="text-white/50">Loading document...</Text>
        </View>
      </ScreenWrapper>
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
        "Could not extract data from this document. Please fill in the details manually."
      );
    } finally {
      setExtracting(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header
        title={document.title}
        showBack
        rightAction={{
          icon: "trash-outline",
          onPress: handleDelete,
        }}
      />

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Document Image */}
        <View className="mb-5">
          {document.frontImageUrl && (
            <View className="overflow-hidden rounded-2xl">
              <Image
                source={{
                  uri: showFront
                    ? document.frontImageUrl
                    : document.backImageUrl || document.frontImageUrl,
                }}
                style={{ width: width - 40, height: (width - 40) * 0.63 }}
                resizeMode="cover"
                className="rounded-2xl"
              />
            </View>
          )}
          {document.backImageUrl && (
            <View className="flex-row justify-center mt-3 gap-3">
              <TouchableOpacity
                onPress={() => setShowFront(true)}
                className={`px-4 py-2 rounded-lg ${showFront ? "bg-primary" : "bg-white/10"}`}
              >
                <Text className="text-white text-sm">Front</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowFront(false)}
                className={`px-4 py-2 rounded-lg ${!showFront ? "bg-primary" : "bg-white/10"}`}
              >
                <Text className="text-white text-sm">Back</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Verification Status */}
        <GlassCard className="mb-4">
          <View className="flex-row items-center">
            <View
              className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                document.verified ? "bg-success/20" : "bg-warning/20"
              }`}
            >
              <Ionicons
                name={
                  document.verified
                    ? "shield-checkmark"
                    : "shield-half-outline"
                }
                size={22}
                color={document.verified ? "#00C853" : "#FFB300"}
              />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold">
                {document.verified
                  ? "Verified Credential"
                  : "Pending Verification"}
              </Text>
              <Text className="text-white/50 text-sm mt-0.5">
                {document.verified
                  ? "This document has been verified"
                  : "Verification may take up to 24 hours"}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Document Details */}
        <GlassCard className="mb-4">
          <Text className="text-white font-semibold text-lg mb-4">
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
                className="flex-row items-center justify-between py-3 border-b border-white/5"
              >
                <Text className="text-white/50 text-sm">{item.label}</Text>
                <Text className="text-white text-sm font-medium capitalize">
                  {item.value}
                </Text>
              </View>
            ))}

          {/* Expiry warning */}
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
                  color={daysUntilExpiry <= 0 ? "#FF3D71" : "#FFB300"}
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
        </GlassCard>

        {/* AI Extracted Metadata */}
        {document.metadata && (
          <GlassCard className="mb-4">
            <Text className="text-white font-semibold text-lg mb-3">
              Extracted Information
            </Text>
            {Object.entries(document.metadata as Record<string, any>)
              .filter(
                ([key, value]) => value && key !== "raw" && typeof value === "string"
              )
              .map(([key, value]) => (
                <View
                  key={key}
                  className="flex-row items-center justify-between py-2 border-b border-white/5"
                >
                  <Text className="text-white/50 text-sm capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </Text>
                  <Text className="text-white text-sm font-medium">
                    {String(value)}
                  </Text>
                </View>
              ))}
          </GlassCard>
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
              <Ionicons name="sparkles" size={18} color="#6C63FF" />
            }
            className="mb-4"
          />
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
