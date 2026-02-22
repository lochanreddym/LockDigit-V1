import React, { useRef, useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  Platform,
  Dimensions,
  FlatList,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import QRCode from "react-native-qrcode-svg";
let MediaLibrary: any = null;
let FSFile: any = null;
let Paths: any = null;
let Sharing: any = null;

try {
  MediaLibrary = require("expo-media-library");
} catch {}
try {
  const fs = require("expo-file-system");
  FSFile = fs.File;
  Paths = fs.Paths;
} catch {}
try {
  Sharing = require("expo-sharing");
} catch {}
import { getBankLogo } from "@/lib/card-utils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 64;
const QR_SIZE = Math.min(CARD_WIDTH - 64, 240);

type BankAccount = {
  _id: Id<"bankAccounts">;
  bankName: string;
  accountLast4: string;
  type?: "bank" | "card";
};

export default function ReceiveMoneyScreen() {
  const router = useRouter();
  const { userId, phone } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;
  const qrRefs = useRef<Record<string, any>>({});
  const [activeIndex, setActiveIndex] = useState(0);

  const user = useQuery(
    api.users.getById,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  const bankAccounts = useQuery(
    api.payments.listBankAccounts,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  const accounts = useMemo(() => {
    if (!bankAccounts) return [];
    return bankAccounts.filter(
      (a: BankAccount) => !a.type || a.type === "bank"
    ) as BankAccount[];
  }, [bankAccounts]);

  const hasLinkedAccount = accounts.length > 0;

  const userIdentifier = phone || "—";

  const getQRPayload = useCallback(
    (account: BankAccount) => {
      const name = user?.name || "User";
      const userPhone = phone || "";
      return `lockdigit://pay?merchant=${encodeURIComponent(userPhone)}&name=${encodeURIComponent(name)}&bank=${encodeURIComponent(account.bankName)}&acc=${encodeURIComponent(account.accountLast4)}`;
    },
    [user?.name, phone]
  );

  const getQRBase64 = useCallback(
    (accountId: string): Promise<string | null> => {
      return new Promise((resolve) => {
        const ref = qrRefs.current[accountId];
        if (!ref) {
          resolve(null);
          return;
        }
        ref.toDataURL((base64: string) => {
          resolve(base64);
        });
      });
    },
    []
  );

  const handleSaveToGallery = async (accountId: string) => {
    if (!MediaLibrary || !FSFile || !Paths) {
      Alert.alert(
        "Rebuild Required",
        "Save to gallery requires a new development build. Run: npx expo run:ios",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant media library access to save QR codes."
        );
        return;
      }

      const base64 = await getQRBase64(accountId);
      if (!base64) {
        Alert.alert("Error", "Unable to capture QR code.");
        return;
      }

      const file = new FSFile(Paths.cache, `lockdigit-qr-${Date.now()}.png`);
      file.create();
      file.write(base64, { encoding: "base64" });

      await MediaLibrary.saveToLibraryAsync(file.uri);
      Alert.alert("Saved", "QR code saved to your photo gallery.");
    } catch {
      Alert.alert("Error", "Failed to save QR code to gallery.");
    }
  };

  const handleShare = async (account: BankAccount) => {
    try {
      const qrPayload = getQRPayload(account);
      const shareText = `Pay me on LockDigit!\n\nScan this link to send money:\n${qrPayload}`;

      if (Platform.OS === "web" || !FSFile || !Paths || !Sharing) {
        await Share.share({
          message: shareText,
          title: "LockDigit - Receive Money",
        });
        return;
      }

      const base64 = await getQRBase64(account._id);
      if (!base64) {
        await Share.share({
          message: shareText,
          title: "LockDigit - Receive Money",
        });
        return;
      }

      const file = new FSFile(Paths.cache, `lockdigit-qr-${Date.now()}.png`);
      file.create();
      file.write(base64, { encoding: "base64" });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "image/png",
          dialogTitle: "Share your LockDigit QR Code",
        });
      } else {
        await Share.share({
          message: shareText,
          title: "LockDigit - Receive Money",
        });
      }
    } catch {
      // user dismissed
    }
  };

  const onScroll = useCallback(
    (event: any) => {
      const offset = event.nativeEvent.contentOffset.x;
      const index = Math.round(offset / (CARD_WIDTH + 16));
      if (index !== activeIndex && index >= 0 && index < accounts.length) {
        setActiveIndex(index);
      }
    },
    [activeIndex, accounts.length]
  );

  const renderQRCard = useCallback(
    ({ item: account }: { item: BankAccount }) => {
      const qrPayload = getQRPayload(account);
      const bankLogo = getBankLogo(account.bankName);

      return (
        <View style={[styles.cardOuter, { width: CARD_WIDTH }]}>
          {/* MY QR watermark */}
          <Text style={styles.watermark}>MY QR</Text>

          <View style={styles.cardInner}>
            {/* Bank name header */}
            <View className="flex-row items-center px-5 pt-5 pb-4">
              <Image
                source={bankLogo}
                style={styles.bankIcon}
                resizeMode="contain"
              />
              <Text className="text-ios-dark text-base font-semibold ml-2.5">
                {account.bankName} - {account.accountLast4}
              </Text>
            </View>

            {/* QR Code */}
            <View className="items-center px-5 pb-4">
              {Platform.OS === "web" ? (
                <View style={styles.qrPlaceholder}>
                  <Text className="text-ios-grey4 text-sm text-center">
                    QR code available in the mobile app
                  </Text>
                </View>
              ) : (
                <QRCode
                  value={qrPayload}
                  size={QR_SIZE}
                  backgroundColor="white"
                  color="#1C1C1E"
                  getRef={(ref: any) => {
                    qrRefs.current[account._id] = ref;
                  }}
                />
              )}
            </View>

            {/* User ID */}
            <View className="flex-row items-center justify-center px-5 pb-5">
              <Text className="text-ios-grey4 text-sm">
                LockDigit ID: {userIdentifier}
              </Text>
              <TouchableOpacity className="ml-2 p-1" activeOpacity={0.6}>
                <Ionicons name="copy-outline" size={16} color="#C7C7CC" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action buttons */}
          <View className="flex-row mt-4" style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={() => handleSaveToGallery(account._id)}
              activeOpacity={0.8}
              style={styles.actionBtn}
            >
              <Ionicons
                name="download-outline"
                size={18}
                color="#1C1C1E"
              />
              <Text className="text-ios-dark text-sm font-medium ml-2">
                Download
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleShare(account)}
              activeOpacity={0.8}
              style={styles.actionBtn}
            >
              <Ionicons
                name="share-social-outline"
                size={18}
                color="#1C1C1E"
              />
              <Text className="text-ios-dark text-sm font-medium ml-2">
                Share
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [getQRPayload, userIdentifier]
  );

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center px-5 pt-2 pb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white border border-ios-border items-center justify-center mr-3"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#1C1C1E" />
          </TouchableOpacity>
          <Text className="text-ios-dark text-xl font-bold">Receive Money</Text>
        </View>

        {!hasLinkedAccount ? (
          <View className="flex-1 px-5 justify-center items-center">
            <View
              className="bg-white rounded-3xl border border-ios-border items-center justify-center w-full"
              style={styles.emptyCard}
            >
              <View className="w-16 h-16 rounded-full bg-orange-500/10 items-center justify-center mb-3">
                <Ionicons
                  name="alert-circle-outline"
                  size={32}
                  color="#FF9500"
                />
              </View>
              <Text className="text-ios-dark text-base font-semibold text-center">
                No Bank Account Linked
              </Text>
              <Text className="text-ios-grey4 text-sm mt-2 text-center px-4">
                Add a bank account first to receive money via QR code.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(app)/add-bank-account")}
                className="bg-primary rounded-xl px-6 py-3 mt-4"
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold">
                  Add Bank Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="flex-1">
            {/* QR Cards carousel */}
            <FlatList
              data={accounts}
              renderItem={renderQRCard}
              keyExtractor={(item) => item._id}
              horizontal
              pagingEnabled={false}
              snapToInterval={CARD_WIDTH + 16}
              snapToAlignment="center"
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              onScroll={onScroll}
              scrollEventThrottle={16}
            />

            {/* Page indicator dots */}
            {accounts.length > 1 && (
              <View className="flex-row justify-center mt-4" style={{ gap: 6 }}>
                {accounts.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === activeIndex ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Info text */}
            <View className="px-8 mt-6 mb-4">
              <Text className="text-ios-grey4 text-xs text-center leading-4">
                Anyone with LockDigit can scan your QR code to send you money
                instantly. Share it or let them scan directly from your screen.
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  carouselContent: {
    paddingHorizontal: 32,
    paddingTop: 16,
  },
  cardOuter: {
    marginRight: 16,
    alignItems: "center",
  },
  watermark: {
    fontSize: 32,
    fontWeight: "700",
    color: "#E5E5EA",
    letterSpacing: 4,
    marginBottom: 12,
  },
  cardInner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F2F2F7",
  },
  bankIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  qrPlaceholder: {
    width: QR_SIZE,
    height: QR_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: "#1C1C1E",
  },
  dotInactive: {
    backgroundColor: "#D1D1D6",
  },
  emptyCard: {
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
});
