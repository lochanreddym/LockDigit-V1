import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RowDivider, SectionCard } from "@/components/profile";
import { useFirebaseSessionReady } from "@/hooks/useFirebaseSessionReady";
import { useTheme } from "@/hooks/useTheme";
import { formatDate } from "@/lib/utils";

export default function LinkedDocumentsScreen() {
  const theme = useTheme();
  const { hasUser: firebaseHasUser } = useFirebaseSessionReady();
  const documents = useQuery(api.documents.listMine, firebaseHasUser ? {} : "skip");
  const items = documents ?? [];

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg }}>
      <SafeAreaView className="flex-1" edges={["bottom"]}>
        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          {items.length === 0 ? (
            <SectionCard>
              <View className="px-4 py-4">
                <Text className="text-sm" style={{ color: theme.subtext }}>
                  No documents added yet.
                </Text>
              </View>
            </SectionCard>
          ) : (
            <SectionCard>
              {items.map((doc, index) => (
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
                      Added {formatDate(doc.createdAt)}
                    </Text>
                  </View>
                  {index < items.length - 1 ? <RowDivider /> : null}
                </React.Fragment>
              ))}
            </SectionCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

