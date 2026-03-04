import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DOCUMENT_CATEGORIES, DocumentType } from "@/constants/documentCategories";
import { useFirebaseSessionReady } from "@/hooks/useFirebaseSessionReady";

export default function DocumentCategoryDetailScreen() {
  const router = useRouter();
  const { hasUser: firebaseHasUser } = useFirebaseSessionReady();
  const { category } = useLocalSearchParams<{ category: string }>();
  const documents = useQuery(
    api.documents.listMine,
    firebaseHasUser ? {} : "skip"
  );

  const cat = DOCUMENT_CATEGORIES.find((c) => c.id === category);

  if (!cat) {
    return (
      <View className="flex-1 bg-ios-bg items-center justify-center">
        <Text className="text-ios-grey4">Category not found</Text>
      </View>
    );
  }

  const storedDocsByType = new Map<string, string>();
  if (documents) {
    for (const doc of documents) {
      if (!storedDocsByType.has(doc.type)) {
        storedDocsByType.set(doc.type, doc._id);
      }
    }
  }

  const handleDocumentSelect = (doc: DocumentType) => {
    const existingDocId = storedDocsByType.get(doc.id);
    if (existingDocId) {
      router.push({
        pathname: "/(app)/document/[id]",
        params: { id: existingDocId },
      });
    } else if (doc.requiresState) {
      router.push({
        pathname: "/(app)/document-categories/select-state",
        params: { docType: doc.id, docLabel: doc.label },
      });
    } else {
      router.push({
        pathname: "/(app)/(tabs)/wallet",
        params: { addDocType: doc.id, addDocLabel: doc.label },
      });
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
              className="w-10 h-10 rounded-full bg-ios-bg items-center justify-center mr-3"
            >
              <Ionicons name="chevron-back" size={22} color="#1C1C1E" />
            </TouchableOpacity>
            <View className="flex-1">
              <View className="flex-row items-center">
                <View
                  className="w-8 h-8 rounded-xl items-center justify-center mr-2"
                  style={{ backgroundColor: `${cat.color}15` }}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={18}
                    color={cat.color}
                  />
                </View>
                <Text className="text-xl font-bold text-ios-dark">
                  {cat.label}
                </Text>
              </View>
              <Text className="text-ios-grey4 text-sm mt-0.5">
                Select a document type to add
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}
        >
          {cat.subSections.map((section) => (
            <View key={section.title} className="px-5 mb-5">
              <Text className="text-ios-grey4 text-xs font-semibold uppercase tracking-wider mb-2 px-1">
                {section.title}
              </Text>
              <View
                className="bg-white rounded-2xl border border-ios-border overflow-hidden"
                style={styles.card}
              >
                {section.items.map((doc, idx) => {
                  const isStored = storedDocsByType.has(doc.id);

                  return (
                    <TouchableOpacity
                      key={doc.id}
                      onPress={() => handleDocumentSelect(doc)}
                      activeOpacity={0.6}
                      className={`flex-row items-center px-4 py-3.5 ${
                        idx < section.items.length - 1
                          ? "border-b border-ios-border"
                          : ""
                      }`}
                    >
                      <View
                        className="w-8 h-8 rounded-lg items-center justify-center mr-3"
                        style={{
                          backgroundColor: isStored
                            ? "#30D15815"
                            : `${cat.color}10`,
                        }}
                      >
                        <Ionicons
                          name={
                            isStored
                              ? "checkmark-circle"
                              : "document-outline"
                          }
                          size={16}
                          color={isStored ? "#30D158" : cat.color}
                        />
                      </View>
                      <View className="flex-1 mr-2">
                        <Text className="text-ios-dark text-sm font-medium">
                          {doc.label}
                        </Text>
                        {!isStored && doc.requiresState && (
                          <Text className="text-ios-grey4 text-[10px] mt-0.5">
                            State selection required
                          </Text>
                        )}
                      </View>
                      {isStored ? (
                        <View className="flex-row items-center">
                          <Text className="text-xs text-[#30D158] font-medium mr-1">
                            Stored
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color="#30D158"
                          />
                        </View>
                      ) : (
                        <Ionicons
                          name="add-circle-outline"
                          size={20}
                          color={cat.color}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
});
