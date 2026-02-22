import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  Share,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { BillCard } from "@/components/payments";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";

const ID_DOC_TYPES = ["national_id", "drivers_license", "passport"] as const;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CATEGORIES = [
  { icon: "id-card-outline", label: "Government IDs", color: "#0A84FF" },
  { icon: "school-outline", label: "Education", color: "#5E5CE6" },
  { icon: "card-outline", label: "Banking", color: "#30D158" },
  { icon: "medkit-outline", label: "Healthcare", color: "#FF3B30" },
  { icon: "car-outline", label: "Driving", color: "#FF9500" },
  { icon: "globe-outline", label: "Travel", color: "#0A84FF" },
  { icon: "shield-outline", label: "Insurance", color: "#5E5CE6" },
  { icon: "business-outline", label: "Employment", color: "#30D158" },
  { icon: "home-outline", label: "Property", color: "#FF9500" },
  { icon: "receipt-outline", label: "Tax & Finance", color: "#FF3B30" },
  { icon: "trophy-outline", label: "Certificates", color: "#0A84FF" },
  { icon: "document-outline", label: "Other", color: "#8E8E93" },
] as const;

function maskId(idNumber: string): string {
  if (!idNumber || idNumber.length < 4) return "****";
  const last4 = idNumber.slice(-4);
  return "X".repeat(Math.min(idNumber.length - 4, 12)) + last4;
}

export default function HomeScreen() {
  const router = useRouter();
  const { userId, phone } = useAuthStore();
  const [qrZoomVisible, setQrZoomVisible] = useState(false);

  const convexUserId = userId as Id<"users"> | null;

  const user = useQuery(
    api.users.getById,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const documents = useQuery(
    api.documents.listByUser,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  // Skip identity request query until Convex has identityRequests.getByPhone deployed
  const identityRequest = useQuery(
    api.users.getById,
    "skip"
  ) as { fullName?: string; idNumber?: string } | undefined;
  const upcomingBills = useQuery(
    api.bills.getUpcomingBills,
    convexUserId ? { userId: convexUserId, daysAhead: 7 } : "skip"
  );

  const verifiedCount = documents?.filter((d) => d.verified).length ?? 0;
  const isVerified = verifiedCount > 0;

  const fullName = identityRequest?.fullName ?? user?.name ?? "User";
  const dateOfBirth = (user as any)?.dateOfBirth ?? "—";
  const address = (user as any)?.address ?? "—";
  const idNumber = identityRequest?.idNumber ?? "";
  const idLast4 = idNumber ? idNumber.slice(-4) : "";
  const idMasked = maskId(idNumber);

  const defaultIdImageUrl =
    documents?.find((d) => ID_DOC_TYPES.includes(d.type as any))?.frontImageUrl ??
    null;

  const qrPayload = useMemo(() => {
    const payload = JSON.stringify({
      name: fullName,
      dateOfBirth: dateOfBirth === "—" ? "" : dateOfBirth,
      address: address === "—" ? "" : address,
      idLast4: idLast4 || "",
    });
    return payload || "{}";
  }, [fullName, dateOfBirth, address, idLast4]);

  const handleShare = async () => {
    const text = [
      `Name: ${fullName}`,
      `Date of birth: ${dateOfBirth}`,
      `Address: ${address}`,
      `ID number: ${idMasked}`,
    ].join("\n");
    try {
      if (Share?.share) {
        await Share.share({
          message: text,
          title: "LockDigit – Verification",
        });
      }
    } catch {
      // user dismissed or not supported
    }
  };

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
            <View>
              <Text className="text-ios-grey4 text-sm">Welcome back</Text>
              <Text className="text-ios-dark text-xl font-bold">
                {user?.name || "User"}
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => router.push("/(app)/search")}
                className="w-10 h-10 rounded-full bg-ios-bg border border-ios-border items-center justify-center"
              >
                <Ionicons name="search" size={20} color="#1C1C1E" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/(app)/scan-to-pay")}
                className="w-10 h-10 rounded-full bg-primary items-center justify-center"
                style={styles.scanShadow}
              >
                <Ionicons name="qr-code" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Dashboard Card: ID pic, verification, QR, details, share */}
          <View className="px-5 mb-5">
            <LinearGradient
              colors={["#0A84FF", "#5E5CE6", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-3xl overflow-hidden"
              style={styles.heroShadow}
            >
              <View className="absolute top-4 right-4 w-24 h-24 rounded-2xl bg-white/10 rotate-12" />
              <View className="absolute bottom-4 left-8 w-16 h-16 rounded-xl bg-white/5 -rotate-12" />

              <View className="p-5">
                <View className="flex-row items-start justify-between mb-4">
                  {/* User pic (default ID image) */}
                  <View className="items-center">
                    {defaultIdImageUrl ? (
                      <Image
                        source={{ uri: defaultIdImageUrl }}
                        className="w-20 h-20 rounded-full bg-white/20"
                        style={styles.avatar}
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center">
                        <Text className="text-white text-2xl font-bold">
                          {(user?.name || "U").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text className="text-white/90 text-sm mt-1.5 font-medium">
                      {user?.name || "User"}
                    </Text>
                  </View>

                  {/* Verification status */}
                  <View className="flex-1 mx-4">
                    <View className="flex-row items-center">
                      <View
                        className="w-2.5 h-2.5 rounded-full mr-2"
                        style={{
                          backgroundColor: isVerified ? "#30D158" : "#FF3B30",
                        }}
                      />
                      <Text className="text-white/90 text-sm font-medium">
                        {isVerified ? "Verified" : "Not Yet Verified"}
                      </Text>
                    </View>
                    <Text className="text-white/70 text-xs mt-1">
                      {documents?.length ?? 0} documents | {verifiedCount} verified
                    </Text>
                  </View>

                  {/* QR code: tap to zoom (code + label below) */}
                  <TouchableOpacity
                    onPress={() => setQrZoomVisible(true)}
                    activeOpacity={0.9}
                    className="items-center"
                  >
                    <View className="bg-white rounded-2xl p-2 min-w-[72px] min-h-[72px] items-center justify-center">
                      {Platform.OS === "web" ? (
                        <Text className="text-ios-grey4 text-xs text-center">QR in app</Text>
                      ) : (
                        <QRCode
                          value={qrPayload}
                          size={72}
                          backgroundColor="white"
                          color="#1C1C1E"
                        />
                      )}
                    </View>
                    <Text className="text-white/90 text-xs mt-1.5">Tap to zoom</Text>
                  </TouchableOpacity>
                </View>

                {/* User details */}
                <View className="bg-white/15 rounded-2xl p-4 mb-3">
                  <Text className="text-white/70 text-xs mb-1">Full name</Text>
                  <Text className="text-white font-semibold">{fullName}</Text>
                  <Text className="text-white/70 text-xs mt-2 mb-1">Date of birth</Text>
                  <Text className="text-white font-medium">{dateOfBirth}</Text>
                  <Text className="text-white/70 text-xs mt-2 mb-1">Address</Text>
                  <Text className="text-white font-medium">{address}</Text>
                </View>

                {/* Share button */}
                <TouchableOpacity
                  onPress={handleShare}
                  className="flex-row items-center justify-center bg-white/20 rounded-2xl py-3"
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                  <Text className="text-white font-semibold ml-2">Share</Text>
                </TouchableOpacity>

              </View>
            </LinearGradient>
          </View>

          {/* QR zoom modal: blur background, large QR, tap to close */}
          <Modal
            visible={qrZoomVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setQrZoomVisible(false)}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setQrZoomVisible(false)}
            >
              {Platform.OS === "web" ? (
                <View style={[StyleSheet.absoluteFill, styles.blurFallback]} />
              ) : (
                <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
              )}
              <View style={styles.qrModalContent}>
                <View style={styles.qrModalBox}>
                  {Platform.OS === "web" ? (
                    <Text className="text-ios-grey4">Scan in mobile app</Text>
                  ) : (
                    <QRCode
                      value={qrPayload}
                      size={Math.min(SCREEN_WIDTH * 0.7, 280)}
                      backgroundColor="white"
                      color="#1C1C1E"
                    />
                  )}
                  <Text className="text-ios-dark mt-3 text-center font-medium">
                    Scan to verify
                  </Text>
                </View>
              </View>
            </Pressable>
          </Modal>

          {/* Quick Actions */}
          <View className="px-5 mb-5">
            <Text className="text-ios-dark font-semibold text-lg mb-3">
              Quick Actions
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {[
                {
                  icon: "receipt-outline" as const,
                  label: "Pay a Bill",
                  color: "#0A84FF",
                  onPress: () => router.push("/(app)/categories"),
                },
                {
                  icon: "shield-checkmark-outline" as const,
                  label: "Verified Credentials",
                  color: "#30D158",
                  onPress: () => router.push("/(app)/(tabs)/wallet"),
                },
                {
                  icon: "swap-horizontal-outline" as const,
                  label: "Money Transfer",
                  color: "#7C3AED",
                  onPress: () => router.push("/(app)/money-transfer"),
                },
                {
                  icon: "card-outline" as const,
                  label: "Manage Payments",
                  color: "#5E5CE6",
                  onPress: () => router.push("/(app)/my-wallet"),
                },
              ].map((action) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={action.onPress}
                  activeOpacity={0.8}
                  style={styles.actionCardWrapper}
                >
                  <View
                    className="bg-white rounded-3xl border border-ios-border p-4 items-center justify-center"
                    style={styles.actionCard}
                  >
                    <View
                      className="w-14 h-14 rounded-2xl items-center justify-center mb-2"
                      style={{ backgroundColor: `${action.color}15` }}
                    >
                      <Ionicons name={action.icon} size={28} color={action.color} />
                    </View>
                    <Text className="text-ios-dark text-xs font-medium text-center" numberOfLines={2}>
                      {action.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Categories Grid */}
          <View className="px-5 mb-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-ios-dark font-semibold text-lg">
                Categories
              </Text>
              <TouchableOpacity onPress={() => router.push("/(app)/categories")}>
                <Text className="text-primary text-sm">See All</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {CATEGORIES.slice(0, 8).map((cat) => (
                <TouchableOpacity
                  key={cat.label}
                  className="items-center"
                  style={{ width: "22%" }}
                  activeOpacity={0.7}
                >
                  <View
                    className="w-14 h-14 rounded-2xl items-center justify-center mb-1.5"
                    style={{ backgroundColor: `${cat.color}12` }}
                  >
                    <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                  </View>
                  <Text className="text-ios-dark text-[10px] text-center font-medium" numberOfLines={1}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Upcoming Bills */}
          {upcomingBills && upcomingBills.length > 0 && (
            <View className="px-5 mb-5">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-ios-dark font-semibold text-lg">
                  Upcoming Bills
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(app)/(tabs)/payments")}
                >
                  <Text className="text-primary text-sm">See All</Text>
                </TouchableOpacity>
              </View>
              {upcomingBills.slice(0, 3).map((bill) => (
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

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroShadow: {
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  scanShadow: {
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionCardWrapper: {
    width: "48%",
  },
  actionCard: {
    height: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
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
  },
  blurFallback: {
    backgroundColor: "rgba(0,0,0,0.5)",
  },
});
