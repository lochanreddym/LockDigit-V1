import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "@/components/glass";
import { formatDate, getDaysUntil } from "@/lib/utils";

interface DocumentCardProps {
  id: string;
  title: string;
  type: string;
  issuer?: string;
  expiryDate?: number;
  verified: boolean;
  frontImageUrl?: string | null;
  onPress: () => void;
}

const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  drivers_license: "car-outline",
  passport: "globe-outline",
  vaccination: "medkit-outline",
  national_id: "card-outline",
  insurance: "shield-checkmark-outline",
  other: "document-outline",
};

const typeLabels: Record<string, string> = {
  drivers_license: "Driver's License",
  passport: "Passport",
  vaccination: "Vaccination",
  national_id: "National ID",
  insurance: "Insurance",
  other: "Document",
};

export function DocumentCard({
  title,
  type,
  issuer,
  expiryDate,
  verified,
  frontImageUrl,
  onPress,
}: DocumentCardProps) {
  const daysUntilExpiry = expiryDate ? getDaysUntil(expiryDate) : null;
  const isExpiringSoon =
    daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <GlassCard className="mb-3">
        <View className="flex-row items-center">
          {frontImageUrl ? (
            <Image
              source={{ uri: frontImageUrl }}
              className="w-16 h-16 rounded-xl mr-4"
              resizeMode="cover"
            />
          ) : (
            <View className="w-16 h-16 rounded-xl bg-primary/10 items-center justify-center mr-4">
              <Ionicons
                name={typeIcons[type] || "document-outline"}
                size={28}
                color="#0A84FF"
              />
            </View>
          )}

          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-ios-dark font-semibold text-base flex-1" numberOfLines={1}>
                {title}
              </Text>
              {verified && (
                <View className="bg-success/10 px-2 py-0.5 rounded-full ml-2">
                  <Text className="text-success text-xs font-medium">
                    Verified
                  </Text>
                </View>
              )}
            </View>

            <Text className="text-ios-grey4 text-sm mt-1">
              {typeLabels[type] || type}
              {issuer ? ` - ${issuer}` : ""}
            </Text>

            {expiryDate && (
              <View className="flex-row items-center mt-1">
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={
                    isExpired
                      ? "#FF3B30"
                      : isExpiringSoon
                        ? "#FF9500"
                        : "#C7C7CC"
                  }
                />
                <Text
                  className={`text-xs ml-1 ${
                    isExpired
                      ? "text-danger"
                      : isExpiringSoon
                        ? "text-warning"
                        : "text-ios-grey3"
                  }`}
                >
                  {isExpired
                    ? "Expired"
                    : `Expires ${formatDate(expiryDate)}`}
                </Text>
              </View>
            )}
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#C7C7CC"
          />
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}
