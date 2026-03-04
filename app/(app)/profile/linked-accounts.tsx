import React, { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NavRow, RowDivider, SectionCard } from "@/components/profile";
import { linked as linkedMock } from "@/constants/profileMock";
import { useFirebaseSessionReady } from "@/hooks/useFirebaseSessionReady";
import { useTheme } from "@/hooks/useTheme";
import { DOCUMENT_CATEGORIES } from "@/constants/documentCategories";

export default function LinkedAccountsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { hasUser: firebaseHasUser } = useFirebaseSessionReady();
  const documents = useQuery(api.documents.listMine, firebaseHasUser ? {} : "skip");
  const bankAccounts = useQuery(
    api.payments.listBankAccounts,
    firebaseHasUser ? {} : "skip"
  );

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

  const documentsCount = documents?.length ?? linkedMock.documentsCount;
  const bankCount = bankAccounts?.length ?? linkedMock.banksCount;
  const governmentIdsCount =
    documents?.filter((doc) => {
      if (doc.categoryId === "government_ids") return true;
      const docType = doc.documentTypeId ?? doc.type;
      return governmentTypeSet.has(docType);
    }).length ?? linkedMock.idsCount;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg }}>
      <SafeAreaView className="flex-1" edges={["bottom"]}>
        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          <SectionCard>
            <NavRow
              icon="card-outline"
              label="Government IDs"
              value={String(governmentIdsCount)}
              accessibilityLabel="Open government IDs"
              onPress={() => router.push("/(app)/profile/linked-government-ids")}
            />
            <RowDivider />
            <NavRow
              icon="business-outline"
              label="Bank Accounts"
              value={String(bankCount)}
              accessibilityLabel="Open bank accounts"
              onPress={() => router.push("/(app)/profile/linked-bank-accounts")}
            />
            <RowDivider />
            <NavRow
              icon="document-text-outline"
              label="Documents"
              value={String(documentsCount)}
              accessibilityLabel="Open documents"
              onPress={() => router.push("/(app)/profile/linked-documents")}
            />
          </SectionCard>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
