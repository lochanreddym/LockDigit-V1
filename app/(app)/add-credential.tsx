import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const CREDENTIAL_TYPES = [
  {
    icon: "id-card-outline",
    label: "Government ID",
    desc: "National ID, Social Security",
    color: "#0A84FF",
  },
  {
    icon: "car-outline",
    label: "Driver's License",
    desc: "Driving permit, Learner's",
    color: "#FF9500",
  },
  {
    icon: "globe-outline",
    label: "Passport",
    desc: "International travel document",
    color: "#5E5CE6",
  },
  {
    icon: "medkit-outline",
    label: "Health Records",
    desc: "Vaccination, Medical ID",
    color: "#FF3B30",
  },
  {
    icon: "school-outline",
    label: "Education",
    desc: "Degrees, Certificates",
    color: "#30D158",
  },
  {
    icon: "shield-outline",
    label: "Insurance",
    desc: "Health, Auto, Property",
    color: "#0A84FF",
  },
  {
    icon: "business-outline",
    label: "Employment",
    desc: "Work ID, Pay stubs",
    color: "#FF9500",
  },
  {
    icon: "document-outline",
    label: "Other Document",
    desc: "Any other credential",
    color: "#8E8E93",
  },
] as const;

const ADD_METHODS = [
  {
    icon: "cloud-upload-outline",
    label: "Upload from Gallery",
    desc: "Choose an existing photo from your device",
    color: "#0A84FF",
  },
  {
    icon: "camera-outline",
    label: "Scan Document",
    desc: "Take a photo using your camera",
    color: "#30D158",
  },
  {
    icon: "globe-outline",
    label: "Retrieve from Web",
    desc: "Import from a government portal",
    color: "#5E5CE6",
  },
] as const;

export default function AddCredentialScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string>("");
  const [step, setStep] = useState<"type" | "method">("type");

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    setStep("method");
  };

  const handleSelectMethod = (method: string) => {
    // Navigate to wallet screen with the upload modal
    router.replace("/(app)/(tabs)/wallet");
  };

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center px-5 py-3 bg-white border-b border-ios-border">
          <TouchableOpacity
            onPress={() => {
              if (step === "method") {
                setStep("type");
              } else {
                router.back();
              }
            }}
            className="mr-3 p-1"
          >
            <Ionicons name="chevron-back" size={24} color="#0A84FF" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-ios-dark">
            {step === "type" ? "Add Credential" : "Choose Method"}
          </Text>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {step === "type" ? (
            <>
              <Text className="text-ios-grey4 text-sm mb-4">
                Select the type of document you'd like to add
              </Text>

              {CREDENTIAL_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.label}
                  onPress={() => handleSelectType(type.label)}
                  className="flex-row items-center bg-white rounded-2xl border border-ios-border p-4 mb-3"
                  style={styles.cardShadow}
                  activeOpacity={0.7}
                >
                  <View
                    className="w-12 h-12 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: `${type.color}12` }}
                  >
                    <Ionicons name={type.icon as any} size={24} color={type.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-ios-dark font-medium text-base">
                      {type.label}
                    </Text>
                    <Text className="text-ios-grey4 text-sm mt-0.5">
                      {type.desc}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <>
              <View className="flex-row items-center bg-primary/10 rounded-2xl p-3 mb-5">
                <Ionicons name="document-outline" size={20} color="#0A84FF" />
                <Text className="text-primary font-medium ml-2">
                  {selectedType}
                </Text>
              </View>

              <Text className="text-ios-grey4 text-sm mb-4">
                How would you like to add this document?
              </Text>

              {ADD_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.label}
                  onPress={() => handleSelectMethod(method.label)}
                  className="flex-row items-center bg-white rounded-2xl border border-ios-border p-5 mb-3"
                  style={styles.cardShadow}
                  activeOpacity={0.7}
                >
                  <View
                    className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
                    style={{ backgroundColor: `${method.color}12` }}
                  >
                    <Ionicons name={method.icon as any} size={28} color={method.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-ios-dark font-semibold text-base">
                      {method.label}
                    </Text>
                    <Text className="text-ios-grey4 text-sm mt-0.5">
                      {method.desc}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                </TouchableOpacity>
              ))}

              {/* Security note */}
              <View className="bg-ios-bg rounded-2xl border border-ios-border p-4 mt-4">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="shield-checkmark" size={16} color="#30D158" />
                  <Text className="text-ios-dark font-medium text-sm ml-2">
                    Secure Upload
                  </Text>
                </View>
                <Text className="text-ios-grey4 text-xs leading-4">
                  Your documents are encrypted end-to-end and stored securely.
                  Only you can access them with your PIN.
                </Text>
              </View>
            </>
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
