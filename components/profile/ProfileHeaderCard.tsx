import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type ProfileHeaderCardProps = {
  name: string;
  maskedId: string;
  verified: boolean;
  trustScore?: number | string | null;
  memberSince?: number | string | null;
};

type HeaderStat = {
  label: string;
  value: number | string;
};

export function ProfileHeaderCard({
  name,
  maskedId,
  verified,
  trustScore,
  memberSince,
}: ProfileHeaderCardProps) {
  const theme = useTheme();
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  const stats: HeaderStat[] = [];

  if (trustScore !== undefined && trustScore !== null && String(trustScore).length > 0) {
    stats.push({ label: "Trust Score", value: trustScore });
  }
  if (memberSince !== undefined && memberSince !== null && String(memberSince).length > 0) {
    stats.push({ label: "Member Since", value: memberSince });
  }

  return (
    <View
      className="rounded-[22px] border px-4 py-4"
      style={[
        styles.shadow,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <View className="flex-row items-center">
        <View
          className="w-[60px] h-[60px] rounded-full items-center justify-center mr-4"
          style={{ backgroundColor: `${theme.accent}14` }}
        >
          <Text className="text-2xl font-bold" style={{ color: theme.accent }}>
            {initial}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold" style={{ color: theme.text }}>
            {name}
          </Text>
          <Text className="text-sm mt-0.5" style={{ color: theme.subtext }}>
            {maskedId}
          </Text>
          {verified ? (
            <View className="mt-2 flex-row items-center">
              <View
                className="px-2 py-1 rounded-full flex-row items-center"
                style={{ backgroundColor: `${theme.success}1A` }}
              >
                <Ionicons name="shield-checkmark" size={12} color={theme.success} />
                <Text
                  className="text-xs font-medium ml-1"
                  style={{ color: theme.success }}
                >
                  Verified
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      {stats.length > 0 ? (
        <>
          <View className="h-px my-4" style={{ backgroundColor: theme.border }} />
          <View className="flex-row items-center">
            {stats.map((stat, index) => (
              <React.Fragment key={stat.label}>
                <View className="flex-1 items-center">
                  <Text className="text-xl font-bold" style={{ color: theme.accent }}>
                    {stat.value}
                  </Text>
                  <Text className="text-xs mt-0.5" style={{ color: theme.subtext }}>
                    {stat.label}
                  </Text>
                </View>
                {index < stats.length - 1 ? (
                  <View className="w-px h-9" style={{ backgroundColor: theme.border }} />
                ) : null}
              </React.Fragment>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
});

