import React, { useEffect, useMemo, useState } from "react";
import { Appearance, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { NavRow, RowDivider, SectionCard } from "@/components/profile";
import { useTheme } from "@/hooks/useTheme";
import * as SecureStoreHelper from "@/lib/secure-store";
import { DarkModePreference } from "@/lib/secure-store";

type AppearanceOption = {
  key: DarkModePreference;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const OPTIONS: AppearanceOption[] = [
  { key: "system", label: "System", icon: "phone-portrait-outline" },
  { key: "light", label: "Light", icon: "sunny-outline" },
  { key: "dark", label: "Dark", icon: "moon-outline" },
];

export default function AppearanceScreen() {
  const theme = useTheme();
  const [darkModePref, setDarkModePref] = useState<DarkModePreference>("system");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const storedPreference = await SecureStoreHelper.getDarkModePreference();
      if (mounted) {
        setDarkModePref(storedPreference);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelect = async (nextPreference: DarkModePreference) => {
    setDarkModePref(nextPreference);
    await SecureStoreHelper.setDarkModePreference(nextPreference);
    Appearance.setColorScheme(
      nextPreference === "system" ? null : (nextPreference as "light" | "dark")
    );
  };

  const selectedIcon = useMemo(
    () => (
      <Ionicons
        name="checkmark-circle"
        size={20}
        color={theme.accent}
      />
    ),
    [theme.accent]
  );

  const unselectedIcon = useMemo(
    () => <Ionicons name="ellipse-outline" size={20} color={theme.subtext} />,
    [theme.subtext]
  );

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg }}>
      <SafeAreaView className="flex-1" edges={["bottom"]}>
        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          <SectionCard>
            {OPTIONS.map((option, index) => (
              <React.Fragment key={option.key}>
                <NavRow
                  icon={option.icon}
                  label={option.label}
                  accessibilityLabel={`Set appearance to ${option.label}`}
                  onPress={() => handleSelect(option.key)}
                  showChevron={false}
                  rightElement={
                    darkModePref === option.key ? selectedIcon : unselectedIcon
                  }
                />
                {index < OPTIONS.length - 1 ? <RowDivider /> : null}
              </React.Fragment>
            ))}
          </SectionCard>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

