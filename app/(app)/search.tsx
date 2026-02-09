import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ScreenWrapper } from "@/components/common";
import { GlassCard } from "@/components/glass";
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

  // Auto-focus search input
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // Search queries (only fire when we have a query)
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

  // Quick access services
  const quickServices = [
    {
      icon: "card-outline" as const,
      label: "Driver's License",
      onPress: () => {},
    },
    { icon: "globe-outline" as const, label: "Passport", onPress: () => {} },
    {
      icon: "medkit-outline" as const,
      label: "Vaccination",
      onPress: () => {},
    },
    { icon: "flash-outline" as const, label: "Electricity", onPress: () => {} },
    { icon: "wifi-outline" as const, label: "Internet", onPress: () => {} },
    { icon: "call-outline" as const, label: "Phone Bill", onPress: () => {} },
  ];

  return (
    <ScreenWrapper>
      {/* Search Header */}
      <View className="px-5 pt-2 pb-2">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 p-1"
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View className="flex-1 flex-row items-center bg-white/5 border border-glass-border rounded-xl px-4 py-3">
            <Ionicons
              name="search"
              size={20}
              color="rgba(255,255,255,0.5)"
            />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search documents, bills, services..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              className="flex-1 text-white text-base ml-3"
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color="rgba(255,255,255,0.5)"
                />
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
                    : "bg-white/5 border border-glass-border"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    activeFilter === filter.id ? "text-white" : "text-white/60"
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
          // Quick Services
          <View className="mt-4">
            <Text className="text-white font-semibold text-lg mb-3">
              Quick Access
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {quickServices.map((service) => (
                <TouchableOpacity
                  key={service.label}
                  onPress={service.onPress}
                  className="w-[30%]"
                  activeOpacity={0.8}
                >
                  <GlassCard className="items-center py-4">
                    <Ionicons name={service.icon} size={28} color="#6C63FF" />
                    <Text className="text-white/70 text-xs mt-2 text-center">
                      {service.label}
                    </Text>
                  </GlassCard>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : hasResults ? (
          <>
            {/* Document Results */}
            {(activeFilter === "all" || activeFilter === "documents") &&
              documentResults &&
              documentResults.length > 0 && (
                <View className="mt-3">
                  <Text className="text-white/60 text-sm font-medium uppercase tracking-wider mb-2">
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

            {/* Bill Results */}
            {(activeFilter === "all" || activeFilter === "bills") &&
              billResults &&
              billResults.length > 0 && (
                <View className="mt-3">
                  <Text className="text-white/60 text-sm font-medium uppercase tracking-wider mb-2">
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
          // No Results
          <View className="items-center mt-20">
            <Ionicons
              name="search"
              size={48}
              color="rgba(255,255,255,0.2)"
            />
            <Text className="text-white/40 text-base mt-3">
              No results found for "{query}"
            </Text>
            <Text className="text-white/30 text-sm mt-1">
              Try different keywords
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
