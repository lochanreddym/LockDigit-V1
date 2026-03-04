import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RowDivider, SectionCard } from "@/components/profile";
import { useFirebaseSessionReady } from "@/hooks/useFirebaseSessionReady";
import { useTheme } from "@/hooks/useTheme";
import { DOCUMENT_CATEGORIES } from "@/constants/documentCategories";
import { formatDate } from "@/lib/utils";

export default function LinkedGovernmentIdsScreen() {
  const theme = useTheme();
  const { hasUser: firebaseHasUser } = useFirebaseSessionReady();
  const documents = useQuery(api.documents.listMine, firebaseHasUser ? {} : "skip");

  const governmentTypeSet = useMemo(() => {
    const governmentCategory = DOCUMENT_CATEGORIES.find(
      (category) => category.id === "government_ids"
    );
    const types = new Set<string>();
    for (const section of governmentCategory?.subSections ?? []) {
      for (const item of section.items) {
        types.add(item.id);
      }
    }
    return types;
  }, []);

  const governmentIds =
    documents?.filter((doc) => {
      if (doc.categoryId === "government_ids") return true;
      const docType = doc.documentTypeId ?? doc.type;
      return governmentTypeSet.has(docType);
    }) ?? [];

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg }}>
      <SafeAreaView className="flex-1" edges={["bottom"]}>
        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          {governmentIds.length === 0 ? (
            <SectionCard>
              <View className="px-4 py-4">
                <Text className="text-sm" style={{ color: theme.subtext }}>
                  No government IDs added yet.
                </Text>
              </View>
            </SectionCard>
          ) : (
            <SectionCard>
              {governmentIds.map((doc, index) => (
                <React.Fragment key={doc._id}>
                  <View className="min-h-[54px] px-4 py-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-semibold flex-1" style={{ color: theme.text }}>
                        {doc.title}
                      </Text>
                      <View
                        className="px-2 py-1 rounded-full ml-3"
                        style={{
                          backgroundColor: doc.verified
                            ? `${theme.success}1A`
                            : `${theme.subtext}1A`,
                        }}
                      >
                        <Text
                          className="text-[11px] font-medium"
                          style={{ color: doc.verified ? theme.success : theme.subtext }}
                        >
                          {doc.verified ? "Verified" : "Pending"}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs mt-1" style={{ color: theme.subtext }}>
                      {doc.issuer ? `${doc.issuer} • ` : ""}
                      Added {formatDate(doc.createdAt)}
                    </Text>
                  </View>
                  {index < governmentIds.length - 1 ? <RowDivider /> : null}
                </React.Fragment>
              ))}
            </SectionCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

