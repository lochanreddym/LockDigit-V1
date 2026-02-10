import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { GlassCard } from "@/components/glass";

interface DocumentUploaderProps {
  label: string;
  imageUri?: string;
  onImageSelected: (uri: string) => void;
  onRemove?: () => void;
}

export function DocumentUploader({
  label,
  imageUri,
  onImageSelected,
  onRemove,
}: DocumentUploaderProps) {
  const [loading, setLoading] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    setLoading(true);
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
        aspect: [16, 10],
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const showOptions = () => {
    Alert.alert("Upload Document", "Choose a method", [
      { text: "Camera", onPress: () => pickImage(true) },
      { text: "Photo Library", onPress: () => pickImage(false) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  if (imageUri) {
    return (
      <View className="mb-4">
        <Text className="text-sm text-ios-dark mb-2 font-medium">{label}</Text>
        <View className="relative">
          <Image
            source={{ uri: imageUri }}
            className="w-full h-48 rounded-2xl"
            resizeMode="cover"
          />
          {onRemove && (
            <TouchableOpacity
              onPress={onRemove}
              className="absolute top-2 right-2 bg-black/50 rounded-full p-1"
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View className="mb-4">
      <Text className="text-sm text-ios-dark mb-2 font-medium">{label}</Text>
      <TouchableOpacity onPress={showOptions} activeOpacity={0.7}>
        <GlassCard className="items-center py-8">
          <Ionicons
            name="cloud-upload-outline"
            size={40}
            color="#C7C7CC"
          />
          <Text className="text-ios-grey4 mt-3 text-sm">
            Tap to upload or take a photo
          </Text>
          <Text className="text-ios-grey3 mt-1 text-xs">
            Supports JPG, PNG
          </Text>
        </GlassCard>
      </TouchableOpacity>
    </View>
  );
}
