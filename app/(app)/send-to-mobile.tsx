import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  SectionList,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";

let Contacts: any = null;
try {
  Contacts = require("expo-contacts");
} catch {}

type ContactItem = {
  id: string;
  name: string;
  phone: string;
  isRecent?: boolean;
};

export default function SendToMobileScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;

  const [search, setSearch] = useState("");
  const [deviceContacts, setDeviceContacts] = useState<ContactItem[]>([]);
  const [contactsPermission, setContactsPermission] = useState<
    "granted" | "denied" | "pending"
  >("pending");

  const recentContacts = useQuery(
    api.payments.getRecentTransferContacts,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  useEffect(() => {
    loadDeviceContacts();
  }, []);

  const loadDeviceContacts = async () => {
    if (!Contacts) {
      setContactsPermission("denied");
      return;
    }

    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        setContactsPermission("denied");
        return;
      }

      setContactsPermission("granted");
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });

      const mapped: ContactItem[] = [];
      for (const contact of data) {
        if (contact.phoneNumbers?.length) {
          const phone = contact.phoneNumbers[0].number?.replace(/[\s\-()]/g, "") || "";
          if (phone) {
            mapped.push({
              id: contact.id || phone,
              name:
                [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
                phone,
              phone,
            });
          }
        }
      }
      setDeviceContacts(mapped);
    } catch {
      setContactsPermission("denied");
    }
  };

  const recentContactItems: ContactItem[] = useMemo(() => {
    if (!recentContacts) return [];
    return recentContacts.map((c) => ({
      id: `recent-${c.phone}`,
      name: c.name,
      phone: c.phone,
      isRecent: true,
    }));
  }, [recentContacts]);

  const recentPhones = useMemo(
    () => new Set(recentContactItems.map((c) => c.phone)),
    [recentContactItems]
  );

  const filteredDeviceContacts = useMemo(() => {
    const nonRecent = deviceContacts.filter((c) => !recentPhones.has(c.phone));
    const sorted = nonRecent.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
    return sorted;
  }, [deviceContacts, recentPhones]);

  const searchLower = search.toLowerCase().trim();
  const isPhoneSearch = /^\+?\d[\d\s-]*$/.test(search.trim());

  const filteredRecent = useMemo(() => {
    if (!searchLower) return recentContactItems;
    return recentContactItems.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.phone.includes(searchLower)
    );
  }, [recentContactItems, searchLower]);

  const filteredOther = useMemo(() => {
    if (!searchLower) return filteredDeviceContacts;
    return filteredDeviceContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.phone.includes(searchLower)
    );
  }, [filteredDeviceContacts, searchLower]);

  const sections = useMemo(() => {
    const result: { title: string; data: ContactItem[] }[] = [];
    if (filteredRecent.length > 0) {
      result.push({ title: "Recent", data: filteredRecent });
    }
    if (filteredOther.length > 0) {
      result.push({ title: "Contacts", data: filteredOther });
    }
    return result;
  }, [filteredRecent, filteredOther]);

  const handleSelectContact = (contact: ContactItem) => {
    router.push({
      pathname: "/(app)/send-to-mobile-amount",
      params: { phone: contact.phone, name: contact.name },
    });
  };

  const handleManualSend = () => {
    const cleaned = search.replace(/[\s\-()]/g, "");
    if (cleaned.length < 7) {
      Alert.alert("Invalid Number", "Please enter a valid phone number.");
      return;
    }
    router.push({
      pathname: "/(app)/send-to-mobile-amount",
      params: { phone: cleaned, name: cleaned },
    });
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name[0] || "?").toUpperCase();
  };

  const COLORS = [
    "#0A84FF", "#30D158", "#FF9500", "#FF3B30",
    "#5E5CE6", "#7C3AED", "#AF52DE", "#FF2D55",
  ];

  const getColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return COLORS[Math.abs(hash) % COLORS.length];
  };

  const renderContact = ({ item }: { item: ContactItem }) => {
    const color = getColor(item.name);
    return (
      <TouchableOpacity
        onPress={() => handleSelectContact(item)}
        activeOpacity={0.7}
        className="flex-row items-center px-5 py-3"
      >
        <View
          className="w-11 h-11 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: `${color}18` }}
        >
          <Text style={{ color, fontSize: 15, fontWeight: "700" }}>
            {getInitials(item.name)}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-ios-dark font-semibold text-[15px]">
            {item.name}
          </Text>
          <Text className="text-ios-grey4 text-xs mt-0.5">{item.phone}</Text>
        </View>
        {item.isRecent && (
          <View className="bg-purple-500/10 rounded-full px-2.5 py-1">
            <Text className="text-purple-600 text-[10px] font-semibold">
              Recent
            </Text>
          </View>
        )}
        <Ionicons
          name="chevron-forward"
          size={16}
          color="#C7C7CC"
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({
    section,
  }: {
    section: { title: string };
  }) => (
    <View className="bg-ios-bg px-5 pt-4 pb-2">
      <Text className="text-ios-grey4 text-xs font-semibold uppercase tracking-wide">
        {section.title}
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center px-5 pt-2 pb-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white border border-ios-border items-center justify-center mr-3"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#1C1C1E" />
          </TouchableOpacity>
          <Text className="text-ios-dark text-xl font-bold">
            Send to Mobile
          </Text>
        </View>

        {/* Search */}
        <View className="px-5 pb-3">
          <View
            className="flex-row items-center bg-white rounded-2xl border border-ios-border px-4"
            style={styles.searchShadow}
          >
            <Ionicons name="search" size={20} color="#8E8E93" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Enter name or phone number"
              placeholderTextColor="#8E8E93"
              className="flex-1 py-3.5 px-3 text-ios-dark text-[15px]"
              keyboardType="default"
              autoCorrect={false}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={20} color="#C7C7CC" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Send to entered number */}
        {isPhoneSearch && search.replace(/[\s\-()]/g, "").length >= 7 && (
          <TouchableOpacity
            onPress={handleManualSend}
            activeOpacity={0.7}
            className="mx-5 mb-3"
          >
            <View
              className="flex-row items-center bg-white rounded-2xl border border-ios-border p-4"
              style={styles.searchShadow}
            >
              <View className="w-11 h-11 rounded-full bg-primary/10 items-center justify-center mr-3">
                <Ionicons name="send" size={20} color="#7C3AED" />
              </View>
              <View className="flex-1">
                <Text className="text-ios-dark font-semibold text-[15px]">
                  Send to {search.trim()}
                </Text>
                <Text className="text-ios-grey4 text-xs mt-0.5">
                  Tap to enter amount
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
            </View>
          </TouchableOpacity>
        )}

        {/* Contacts list */}
        {sections.length > 0 ? (
          <SectionList
            sections={sections}
            renderItem={renderContact}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            ItemSeparatorComponent={() => (
              <View className="ml-[68px] mr-5 h-px bg-ios-border" />
            )}
            stickySectionHeadersEnabled={false}
          />
        ) : (
          <View className="flex-1 items-center justify-center px-8">
            {searchLower ? (
              <>
                <Ionicons
                  name="search-outline"
                  size={48}
                  color="#C7C7CC"
                />
                <Text className="text-ios-grey4 text-base font-medium mt-4 text-center">
                  No contacts found
                </Text>
                <Text className="text-ios-grey4 text-sm mt-1 text-center">
                  Try a different name or number
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="people-outline"
                  size={48}
                  color="#C7C7CC"
                />
                <Text className="text-ios-grey4 text-base font-medium mt-4 text-center">
                  No recent contacts
                </Text>
                <Text className="text-ios-grey4 text-sm mt-1 text-center">
                  Enter a phone number above to send money
                </Text>
                {contactsPermission === "denied" && Contacts && (
                  <TouchableOpacity
                    onPress={loadDeviceContacts}
                    className="mt-4 bg-primary/10 rounded-xl px-5 py-2.5"
                    activeOpacity={0.7}
                  >
                    <Text className="text-primary font-semibold text-sm">
                      Allow Contacts Access
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  searchShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
});
