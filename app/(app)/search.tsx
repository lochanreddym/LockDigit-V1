import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { DocumentCard } from "@/components/documents";
import { BillCard } from "@/components/payments";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";

export default function SearchScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;

  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "documents" | "bills">(
    "all"
  );
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const documentResults = useQuery(
    api.documents.search,
    convexUserId && query.length >= 2
      ? { userId: convexUserId, searchQuery: query }
      : "skip"
  );

  const billResults = useQuery(
    api.bills.search,
    convexUserId && query.length >= 2
      ? { userId: convexUserId, searchQuery: query }
      : "skip"
  );

  const hasResults =
    (documentResults && documentResults.length > 0) ||
    (billResults && billResults.length > 0);

  const filters = [
    { id: "all" as const, label: "All" },
    { id: "documents" as const, label: "Documents" },
    { id: "bills" as const, label: "Bills" },
  ];

  const quickServices = [
    { icon: "card-outline" as const, label: "Driver's License", color: "#0A84FF" },
    { icon: "globe-outline" as const, label: "Passport", color: "#5E5CE6" },
    { icon: "medkit-outline" as const, label: "Vaccination", color: "#FF3B30" },
    { icon: "flash-outline" as const, label: "Electricity", color: "#FF9500" },
    { icon: "wifi-outline" as const, label: "Internet", color: "#0A84FF" },
    { icon: "call-outline" as const, label: "Phone Bill", color: "#30D158" },
  ];

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Search Header */}
        <View className="bg-white border-b border-ios-border px-5 pt-2 pb-3">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-3 p-1"
            >
              <Ionicons name="chevron-back" size={24} color="#0A84FF" />
            </TouchableOpacity>
            <View
              className="flex-1 flex-row items-center bg-ios-bg border border-ios-border rounded-xl px-4 py-3"
            >
              <Ionicons name="search" size={20} color="#8E8E93" />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                placeholder="Search documents, bills, services..."
                placeholderTextColor="#86868B"
                className="flex-1 text-ios-dark text-base ml-3"
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={20} color="#C7C7CC" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filters */}
          {query.length >= 2 && (
            <View className="flex-row mt-3 gap-2">
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  onPress={() => setActiveFilter(filter.id)}
                  className={`px-4 py-2 rounded-full ${
                    activeFilter === filter.id
                      ? "bg-primary"
                      : "bg-ios-bg border border-ios-border"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      activeFilter === filter.id ? "text-white" : "text-ios-grey4"
                    }`}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {query.length < 2 ? (
            <View className="mt-4">
              <Text className="text-ios-dark font-semibold text-lg mb-3">
                Quick Access
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {quickServices.map((service) => (
                  <TouchableOpacity
                    key={service.label}
                    className="w-[30%]"
                    activeOpacity={0.8}
                  >
                    <View
                      className="bg-white rounded-2xl border border-ios-border items-center py-4"
                      style={styles.cardShadow}
                    >
                      <View
                        className="w-12 h-12 rounded-xl items-center justify-center mb-2"
                        style={{ backgroundColor: `${service.color}12` }}
                      >
                        <Ionicons
                          name={service.icon}
                          size={24}
                          color={service.color}
                        />
                      </View>
                      <Text className="text-ios-dark text-xs text-center font-medium">
                        {service.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : hasResults ? (
            <>
              {(activeFilter === "all" || activeFilter === "documents") &&
                documentResults &&
                documentResults.length > 0 && (
                  <View className="mt-3">
                    <Text className="text-ios-grey4 text-xs font-semibold uppercase tracking-wider mb-2">
                      Documents
                    </Text>
                    {documentResults.map((doc) => (
                      <DocumentCard
                        key={doc._id}
                        id={doc._id}
                        title={doc.title}
                        type={doc.type}
                        issuer={doc.issuer}
                        expiryDate={doc.expiryDate}
                        verified={doc.verified}
                        onPress={() =>
                          router.push({
                            pathname: "/(app)/document/[id]",
                            params: { id: doc._id },
                          })
                        }
                      />
                    ))}
                  </View>
                )}

              {(activeFilter === "all" || activeFilter === "bills") &&
                billResults &&
                billResults.length > 0 && (
                  <View className="mt-3">
                    <Text className="text-ios-grey4 text-xs font-semibold uppercase tracking-wider mb-2">
                      Bills
                    </Text>
                    {billResults.map((bill) => (
                      <BillCard
                        key={bill._id}
                        title={bill.title}
                        category={bill.category}
                        amount={bill.amount}
                        dueDate={bill.dueDate}
                        status={bill.status}
                        recurring={bill.recurring}
                        onPress={() =>
                          router.push({
                            pathname: "/(app)/bill/[id]",
                            params: { id: bill._id },
                          })
                        }
                      />
                    ))}
                  </View>
                )}
            </>
          ) : (
            <View className="items-center mt-20">
              <Ionicons name="search" size={48} color="#C7C7CC" />
              <Text className="text-ios-grey4 text-base mt-3">
                No results found for "{query}"
              </Text>
              <Text className="text-ios-grey3 text-sm mt-1">
                Try different keywords
              </Text>
            </View>
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
