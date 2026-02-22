import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Vibration,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { GlassButton } from "@/components/glass";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";

const COUNTRIES: { name: string; flag: string }[] = [
  { name: "Afghanistan", flag: "🇦🇫" },
  { name: "Albania", flag: "🇦🇱" },
  { name: "Algeria", flag: "🇩🇿" },
  { name: "Andorra", flag: "🇦🇩" },
  { name: "Angola", flag: "🇦🇴" },
  { name: "Antigua and Barbuda", flag: "🇦🇬" },
  { name: "Argentina", flag: "🇦🇷" },
  { name: "Armenia", flag: "🇦🇲" },
  { name: "Australia", flag: "🇦🇺" },
  { name: "Austria", flag: "🇦🇹" },
  { name: "Azerbaijan", flag: "🇦🇿" },
  { name: "Bahamas", flag: "🇧🇸" },
  { name: "Bahrain", flag: "🇧🇭" },
  { name: "Bangladesh", flag: "🇧🇩" },
  { name: "Barbados", flag: "🇧🇧" },
  { name: "Belarus", flag: "🇧🇾" },
  { name: "Belgium", flag: "🇧🇪" },
  { name: "Belize", flag: "🇧🇿" },
  { name: "Benin", flag: "🇧🇯" },
  { name: "Bhutan", flag: "🇧🇹" },
  { name: "Bolivia", flag: "🇧🇴" },
  { name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { name: "Botswana", flag: "🇧🇼" },
  { name: "Brazil", flag: "🇧🇷" },
  { name: "Brunei", flag: "🇧🇳" },
  { name: "Bulgaria", flag: "🇧🇬" },
  { name: "Burkina Faso", flag: "🇧🇫" },
  { name: "Burundi", flag: "🇧🇮" },
  { name: "Cambodia", flag: "🇰🇭" },
  { name: "Cameroon", flag: "🇨🇲" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "Cape Verde", flag: "🇨🇻" },
  { name: "Central African Republic", flag: "🇨🇫" },
  { name: "Chad", flag: "🇹🇩" },
  { name: "Chile", flag: "🇨🇱" },
  { name: "China", flag: "🇨🇳" },
  { name: "Colombia", flag: "🇨🇴" },
  { name: "Comoros", flag: "🇰🇲" },
  { name: "Congo", flag: "🇨🇬" },
  { name: "Costa Rica", flag: "🇨🇷" },
  { name: "Croatia", flag: "🇭🇷" },
  { name: "Cuba", flag: "🇨🇺" },
  { name: "Cyprus", flag: "🇨🇾" },
  { name: "Czech Republic", flag: "🇨🇿" },
  { name: "Denmark", flag: "🇩🇰" },
  { name: "Djibouti", flag: "🇩🇯" },
  { name: "Dominica", flag: "🇩🇲" },
  { name: "Dominican Republic", flag: "🇩🇴" },
  { name: "Ecuador", flag: "🇪🇨" },
  { name: "Egypt", flag: "🇪🇬" },
  { name: "El Salvador", flag: "🇸🇻" },
  { name: "Equatorial Guinea", flag: "🇬🇶" },
  { name: "Eritrea", flag: "🇪🇷" },
  { name: "Estonia", flag: "🇪🇪" },
  { name: "Eswatini", flag: "🇸🇿" },
  { name: "Ethiopia", flag: "🇪🇹" },
  { name: "Fiji", flag: "🇫🇯" },
  { name: "Finland", flag: "🇫🇮" },
  { name: "France", flag: "🇫🇷" },
  { name: "Gabon", flag: "🇬🇦" },
  { name: "Gambia", flag: "🇬🇲" },
  { name: "Georgia", flag: "🇬🇪" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "Ghana", flag: "🇬🇭" },
  { name: "Greece", flag: "🇬🇷" },
  { name: "Grenada", flag: "🇬🇩" },
  { name: "Guatemala", flag: "🇬🇹" },
  { name: "Guinea", flag: "🇬🇳" },
  { name: "Guinea-Bissau", flag: "🇬🇼" },
  { name: "Guyana", flag: "🇬🇾" },
  { name: "Haiti", flag: "🇭🇹" },
  { name: "Honduras", flag: "🇭🇳" },
  { name: "Hungary", flag: "🇭🇺" },
  { name: "Iceland", flag: "🇮🇸" },
  { name: "India", flag: "🇮🇳" },
  { name: "Indonesia", flag: "🇮🇩" },
  { name: "Iran", flag: "🇮🇷" },
  { name: "Iraq", flag: "🇮🇶" },
  { name: "Ireland", flag: "🇮🇪" },
  { name: "Israel", flag: "🇮🇱" },
  { name: "Italy", flag: "🇮🇹" },
  { name: "Ivory Coast", flag: "🇨🇮" },
  { name: "Jamaica", flag: "🇯🇲" },
  { name: "Japan", flag: "🇯🇵" },
  { name: "Jordan", flag: "🇯🇴" },
  { name: "Kazakhstan", flag: "🇰🇿" },
  { name: "Kenya", flag: "🇰🇪" },
  { name: "Kiribati", flag: "🇰🇮" },
  { name: "Kuwait", flag: "🇰🇼" },
  { name: "Kyrgyzstan", flag: "🇰🇬" },
  { name: "Laos", flag: "🇱🇦" },
  { name: "Latvia", flag: "🇱🇻" },
  { name: "Lebanon", flag: "🇱🇧" },
  { name: "Lesotho", flag: "🇱🇸" },
  { name: "Liberia", flag: "🇱🇷" },
  { name: "Libya", flag: "🇱🇾" },
  { name: "Liechtenstein", flag: "🇱🇮" },
  { name: "Lithuania", flag: "🇱🇹" },
  { name: "Luxembourg", flag: "🇱🇺" },
  { name: "Madagascar", flag: "🇲🇬" },
  { name: "Malawi", flag: "🇲🇼" },
  { name: "Malaysia", flag: "🇲🇾" },
  { name: "Maldives", flag: "🇲🇻" },
  { name: "Mali", flag: "🇲🇱" },
  { name: "Malta", flag: "🇲🇹" },
  { name: "Marshall Islands", flag: "🇲🇭" },
  { name: "Mauritania", flag: "🇲🇷" },
  { name: "Mauritius", flag: "🇲🇺" },
  { name: "Mexico", flag: "🇲🇽" },
  { name: "Micronesia", flag: "🇫🇲" },
  { name: "Moldova", flag: "🇲🇩" },
  { name: "Monaco", flag: "🇲🇨" },
  { name: "Mongolia", flag: "🇲🇳" },
  { name: "Montenegro", flag: "🇲🇪" },
  { name: "Morocco", flag: "🇲🇦" },
  { name: "Mozambique", flag: "🇲🇿" },
  { name: "Myanmar", flag: "🇲🇲" },
  { name: "Namibia", flag: "🇳🇦" },
  { name: "Nauru", flag: "🇳🇷" },
  { name: "Nepal", flag: "🇳🇵" },
  { name: "Netherlands", flag: "🇳🇱" },
  { name: "New Zealand", flag: "🇳🇿" },
  { name: "Nicaragua", flag: "🇳🇮" },
  { name: "Niger", flag: "🇳🇪" },
  { name: "Nigeria", flag: "🇳🇬" },
  { name: "North Korea", flag: "🇰🇵" },
  { name: "North Macedonia", flag: "🇲🇰" },
  { name: "Norway", flag: "🇳🇴" },
  { name: "Oman", flag: "🇴🇲" },
  { name: "Pakistan", flag: "🇵🇰" },
  { name: "Palau", flag: "🇵🇼" },
  { name: "Palestine", flag: "🇵🇸" },
  { name: "Panama", flag: "🇵🇦" },
  { name: "Papua New Guinea", flag: "🇵🇬" },
  { name: "Paraguay", flag: "🇵🇾" },
  { name: "Peru", flag: "🇵🇪" },
  { name: "Philippines", flag: "🇵🇭" },
  { name: "Poland", flag: "🇵🇱" },
  { name: "Portugal", flag: "🇵🇹" },
  { name: "Qatar", flag: "🇶🇦" },
  { name: "Romania", flag: "🇷🇴" },
  { name: "Russia", flag: "🇷🇺" },
  { name: "Rwanda", flag: "🇷🇼" },
  { name: "Saint Kitts and Nevis", flag: "🇰🇳" },
  { name: "Saint Lucia", flag: "🇱🇨" },
  { name: "Saint Vincent and the Grenadines", flag: "🇻🇨" },
  { name: "Samoa", flag: "🇼🇸" },
  { name: "San Marino", flag: "🇸🇲" },
  { name: "Sao Tome and Principe", flag: "🇸🇹" },
  { name: "Saudi Arabia", flag: "🇸🇦" },
  { name: "Senegal", flag: "🇸🇳" },
  { name: "Serbia", flag: "🇷🇸" },
  { name: "Seychelles", flag: "🇸🇨" },
  { name: "Sierra Leone", flag: "🇸🇱" },
  { name: "Singapore", flag: "🇸🇬" },
  { name: "Slovakia", flag: "🇸🇰" },
  { name: "Slovenia", flag: "🇸🇮" },
  { name: "Solomon Islands", flag: "🇸🇧" },
  { name: "Somalia", flag: "🇸🇴" },
  { name: "South Africa", flag: "🇿🇦" },
  { name: "South Korea", flag: "🇰🇷" },
  { name: "South Sudan", flag: "🇸🇸" },
  { name: "Spain", flag: "🇪🇸" },
  { name: "Sri Lanka", flag: "🇱🇰" },
  { name: "Sudan", flag: "🇸🇩" },
  { name: "Suriname", flag: "🇸🇷" },
  { name: "Sweden", flag: "🇸🇪" },
  { name: "Switzerland", flag: "🇨🇭" },
  { name: "Syria", flag: "🇸🇾" },
  { name: "Taiwan", flag: "🇹🇼" },
  { name: "Tajikistan", flag: "🇹🇯" },
  { name: "Tanzania", flag: "🇹🇿" },
  { name: "Thailand", flag: "🇹🇭" },
  { name: "Timor-Leste", flag: "🇹🇱" },
  { name: "Togo", flag: "🇹🇬" },
  { name: "Tonga", flag: "🇹🇴" },
  { name: "Trinidad and Tobago", flag: "🇹🇹" },
  { name: "Tunisia", flag: "🇹🇳" },
  { name: "Turkey", flag: "🇹🇷" },
  { name: "Turkmenistan", flag: "🇹🇲" },
  { name: "Tuvalu", flag: "🇹🇻" },
  { name: "Uganda", flag: "🇺🇬" },
  { name: "Ukraine", flag: "🇺🇦" },
  { name: "United Arab Emirates", flag: "🇦🇪" },
  { name: "United Kingdom", flag: "🇬🇧" },
  { name: "Uruguay", flag: "🇺🇾" },
  { name: "Uzbekistan", flag: "🇺🇿" },
  { name: "Vanuatu", flag: "🇻🇺" },
  { name: "Vatican City", flag: "🇻🇦" },
  { name: "Venezuela", flag: "🇻🇪" },
  { name: "Vietnam", flag: "🇻🇳" },
  { name: "Yemen", flag: "🇾🇪" },
  { name: "Zambia", flag: "🇿🇲" },
  { name: "Zimbabwe", flag: "🇿🇼" },
];

type Step = "country" | "recipient" | "bankDetails" | "amount" | "confirm";

export default function SendInternationallyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ recipientId: string }>();
  const { userId } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;

  const accounts = useQuery(
    api.payments.listBankAccounts,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const intlRecipients = useQuery(
    api.payments.listInternationalRecipients,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const verifyPin = useMutation(api.payments.verifyPaymentPin);
  const createLocalTransfer = useMutation(api.payments.createLocalTransfer);
  const addIntlRecipient = useMutation(
    api.payments.addInternationalRecipient
  );

  const preselected =
    params.recipientId && params.recipientId !== "new"
      ? intlRecipients?.find((r) => r._id === params.recipientId)
      : null;

  const [step, setStep] = useState<Step>(preselected ? "amount" : "country");
  const [isNewRecipient, setIsNewRecipient] = useState(!preselected);
  const [countrySearch, setCountrySearch] = useState("");

  // Recipient details
  const [country, setCountry] = useState(preselected?.country || "");
  const [firstName, setFirstName] = useState(preselected?.firstName || "");
  const [lastName, setLastName] = useState(preselected?.lastName || "");
  const [nickname, setNickname] = useState(preselected?.nickname || "");
  const [address, setAddress] = useState(preselected?.address || "");
  const [city, setCity] = useState(preselected?.city || "");
  const [zipCode, setZipCode] = useState(preselected?.zipCode || "");

  // Bank details
  const [accountNumber, setAccountNumber] = useState("");
  const [swiftCode, setSwiftCode] = useState(preselected?.swiftCode || "");
  const [bankName, setBankName] = useState(preselected?.bankName || "");
  const [recipientAccountLast4, setRecipientAccountLast4] = useState(
    preselected?.accountLast4 || ""
  );

  // Transfer details
  const [amountCents, setAmountCents] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState<Id<"bankAccounts"> | null>(null);
  const [processing, setProcessing] = useState(false);

  // PIN
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinAttempts, setPinAttempts] = useState(0);

  const sourceAccount = sourceAccountId
    ? accounts?.find((a) => a._id === sourceAccountId)
    : null;
  const bankSources = accounts?.filter((a) => a.type !== "card");

  const parsedAmount = parseInt(amountCents || "0", 10);
  const formattedAmount = (parsedAmount / 100).toFixed(2);

  const filteredCountries = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "").replace(/^0+/, "");
    setAmountCents(digits);
  };

  const handleCountrySelect = (c: { name: string; flag: string }) => {
    setCountry(c.name);
    setStep("recipient");
  };

  const handleRecipientContinue = () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Missing Info", "Please enter the recipient's name.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Missing Info", "Please enter the recipient's address.");
      return;
    }
    if (!city.trim()) {
      Alert.alert("Missing Info", "Please enter the city.");
      return;
    }
    if (!zipCode.trim()) {
      Alert.alert("Missing Info", "Please enter the zip/postal code.");
      return;
    }
    setStep("bankDetails");
  };

  const handleBankDetailsContinue = () => {
    if (isNewRecipient) {
      if (!accountNumber.trim() || accountNumber.length < 4) {
        Alert.alert("Missing Info", "Please enter a valid account number.");
        return;
      }
      setRecipientAccountLast4(accountNumber.slice(-4));
    }
    if (!swiftCode.trim() || swiftCode.length < 8) {
      Alert.alert(
        "Missing Info",
        "Please enter a valid SWIFT/BIC code (8-11 characters)."
      );
      return;
    }
    if (!bankName.trim()) {
      Alert.alert("Missing Info", "Please enter the bank name.");
      return;
    }
    setStep("amount");
  };

  const handleAmountContinue = () => {
    if (parsedAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter an amount to send.");
      return;
    }
    setStep("confirm");
  };

  const requestVerification = () => {
    if (!sourceAccountId) {
      Alert.alert("Select Account", "Please select a source account first.");
      return;
    }
    setPin("");
    setPinError("");
    setShowPinModal(true);
  };

  const handlePinSubmit = useCallback(
    async (enteredPin: string) => {
      if (!sourceAccountId) return;
      try {
        const valid = await verifyPin({
          accountId: sourceAccountId,
          pin: enteredPin,
        });
        if (valid) {
          setShowPinModal(false);
          setPin("");
          setPinError("");
          setPinAttempts(0);
          executeTransfer();
        } else {
          const newAttempts = pinAttempts + 1;
          setPinAttempts(newAttempts);
          Vibration.vibrate(300);
          if (newAttempts >= 5) {
            setShowPinModal(false);
            setPin("");
            setPinError("");
            Alert.alert(
              "Too Many Attempts",
              "You've exceeded the maximum number of PIN attempts.",
              [{ text: "OK", onPress: () => router.back() }]
            );
          } else {
            setPinError(
              `Incorrect PIN. ${5 - newAttempts} attempts remaining.`
            );
            setPin("");
          }
        }
      } catch {
        setPinError("Verification failed. Please try again.");
        setPin("");
      }
    },
    [pinAttempts, sourceAccountId]
  );

  const executeTransfer = async () => {
    if (!convexUserId || !sourceAccount) return;
    setProcessing(true);
    try {
      if (isNewRecipient) {
        await addIntlRecipient({
          userId: convexUserId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          nickname: nickname.trim() || undefined,
          address: address.trim(),
          city: city.trim(),
          zipCode: zipCode.trim(),
          country,
          accountLast4: recipientAccountLast4,
          swiftCode: swiftCode.trim().toUpperCase(),
          bankName: bankName.trim(),
        });
      }

      const recipientFullName = `${firstName} ${lastName}`;
      const result = await createLocalTransfer({
        userId: convexUserId,
        amount: parsedAmount,
        type: "wire_transfer",
        description: `Wire transfer to ${recipientFullName} (${country})`,
        merchantName: recipientFullName,
        paymentMethod: `${sourceAccount.bankName} ••${sourceAccount.accountLast4}`,
      });

      if (result.verified && result.transactionId) {
        router.replace({
          pathname: "/(app)/payment-success",
          params: { transactionId: result.transactionId },
        });
      }
    } catch (error: any) {
      Alert.alert("Transfer Failed", error?.message || "Something went wrong.");
    } finally {
      setProcessing(false);
    }
  };

  if (!accounts || !intlRecipients) {
    return (
      <View className="flex-1 bg-ios-bg items-center justify-center">
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  // Step 1: Country picker
  if (step === "country") {
    return (
      <View className="flex-1 bg-ios-bg">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center px-5 pt-2 pb-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white border border-ios-border items-center justify-center mr-3"
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color="#1C1C1E" />
            </TouchableOpacity>
            <Text className="text-ios-dark text-xl font-bold">
              Select Country
            </Text>
          </View>
          <View className="px-5 mb-3">
            <View className="bg-white rounded-xl border border-ios-border flex-row items-center px-3">
              <Ionicons name="search" size={18} color="#8E8E93" />
              <TextInput
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder="Search country..."
                className="flex-1 py-3 px-2 text-ios-dark text-base"
                placeholderTextColor="#C7C7CC"
              />
            </View>
          </View>
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.name}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleCountrySelect(item)}
                className="mb-2"
              >
                <View
                  className="bg-white rounded-2xl border border-ios-border p-4 flex-row items-center"
                  style={styles.cardShadow}
                >
                  <Text style={styles.flagEmoji}>{item.flag}</Text>
                  <Text className="text-ios-dark font-medium text-base flex-1">
                    {item.name}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#C7C7CC"
                  />
                </View>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </View>
    );
  }

  // Step 2: Recipient personal details
  if (step === "recipient") {
    return (
      <View className="flex-1 bg-ios-bg">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center px-5 pt-2 pb-3">
            <TouchableOpacity
              onPress={() => setStep("country")}
              className="w-10 h-10 rounded-full bg-white border border-ios-border items-center justify-center mr-3"
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color="#1C1C1E" />
            </TouchableOpacity>
            <View>
              <Text className="text-ios-dark text-xl font-bold">
                Recipient Details
              </Text>
              <Text className="text-ios-grey4 text-xs">{country}</Text>
            </View>
          </View>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
          >
            <ScrollView
              className="flex-1 px-5"
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              <View
                className="bg-white rounded-3xl border border-ios-border p-5 mt-2"
                style={styles.cardShadow}
              >
                <View className="flex-row gap-3 mb-4">
                  <View className="flex-1">
                    <Text className="text-ios-grey4 text-xs mb-1.5 ml-1">
                      First Name
                    </Text>
                    <TextInput
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="John"
                      className="bg-ios-bg rounded-xl px-4 py-3.5 text-ios-dark text-base"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-ios-grey4 text-xs mb-1.5 ml-1">
                      Last Name
                    </Text>
                    <TextInput
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Doe"
                      className="bg-ios-bg rounded-xl px-4 py-3.5 text-ios-dark text-base"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>

                <Text className="text-ios-grey4 text-xs mb-1.5 ml-1">
                  Nickname (Optional)
                </Text>
                <TextInput
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder="e.g. Dad, Mom"
                  className="bg-ios-bg rounded-xl px-4 py-3.5 text-ios-dark text-base mb-4"
                  placeholderTextColor="#C7C7CC"
                />

                <Text className="text-ios-grey4 text-xs mb-1.5 ml-1">
                  Address
                </Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Street address"
                  className="bg-ios-bg rounded-xl px-4 py-3.5 text-ios-dark text-base mb-4"
                  placeholderTextColor="#C7C7CC"
                />

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-ios-grey4 text-xs mb-1.5 ml-1">
                      City
                    </Text>
                    <TextInput
                      value={city}
                      onChangeText={setCity}
                      placeholder="City"
                      className="bg-ios-bg rounded-xl px-4 py-3.5 text-ios-dark text-base"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-ios-grey4 text-xs mb-1.5 ml-1">
                      Zip / Postal Code
                    </Text>
                    <TextInput
                      value={zipCode}
                      onChangeText={setZipCode}
                      placeholder="10001"
                      className="bg-ios-bg rounded-xl px-4 py-3.5 text-ios-dark text-base"
                      placeholderTextColor="#C7C7CC"
                    />
                  </View>
                </View>
              </View>

              <View className="mt-6">
                <GlassButton
                  title="Continue"
                  onPress={handleRecipientContinue}
                  size="lg"
                  fullWidth
                  icon={
                    <Ionicons
                      name="arrow-forward"
                      size={20}
                      color="#FFFFFF"
                    />
                  }
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // Step 3: Bank / account details
  if (step === "bankDetails") {
    return (
      <View className="flex-1 bg-ios-bg">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center px-5 pt-2 pb-3">
            <TouchableOpacity
              onPress={() => setStep("recipient")}
              className="w-10 h-10 rounded-full bg-white border border-ios-border items-center justify-center mr-3"
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color="#1C1C1E" />
            </TouchableOpacity>
            <Text className="text-ios-dark text-xl font-bold">
              Bank Details
            </Text>
          </View>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
          >
            <ScrollView
              className="flex-1 px-5"
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              <View
                className="bg-white rounded-3xl border border-ios-border p-5 mt-2"
                style={styles.cardShadow}
              >
                <Text className="text-ios-grey4 text-xs mb-1.5 ml-1">
                  Account Number
                </Text>
                <TextInput
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="Enter account number"
                  keyboardType="number-pad"
                  className="bg-ios-bg rounded-xl px-4 py-3.5 text-ios-dark text-base mb-4"
                  placeholderTextColor="#C7C7CC"
                />

                <Text className="text-ios-grey4 text-xs mb-1.5 ml-1">
                  SWIFT / BIC Code
                </Text>
                <TextInput
                  value={swiftCode}
                  onChangeText={(t) =>
                    setSwiftCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11))
                  }
                  placeholder="e.g. CHASUS33"
                  autoCapitalize="characters"
                  maxLength={11}
                  className="bg-ios-bg rounded-xl px-4 py-3.5 text-ios-dark text-base mb-4"
                  placeholderTextColor="#C7C7CC"
                />

                <Text className="text-ios-grey4 text-xs mb-1.5 ml-1">
                  Bank Name
                </Text>
                <TextInput
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="e.g. HDFC Bank"
                  className="bg-ios-bg rounded-xl px-4 py-3.5 text-ios-dark text-base"
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View className="mt-6">
                <GlassButton
                  title="Continue"
                  onPress={handleBankDetailsContinue}
                  size="lg"
                  fullWidth
                  icon={
                    <Ionicons
                      name="arrow-forward"
                      size={20}
                      color="#FFFFFF"
                    />
                  }
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // Step 4: Amount entry
  if (step === "amount") {
    return (
      <View className="flex-1 bg-ios-bg">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center px-5 pt-2 pb-3">
            <TouchableOpacity
              onPress={() =>
                setStep(preselected ? "bankDetails" : "bankDetails")
              }
              className="w-10 h-10 rounded-full bg-white border border-ios-border items-center justify-center mr-3"
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color="#1C1C1E" />
            </TouchableOpacity>
            <Text className="text-ios-dark text-xl font-bold">
              Enter Amount
            </Text>
          </View>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
          >
            <View className="flex-1 px-5 justify-center">
              <View className="items-center mb-6">
                <View className="w-16 h-16 rounded-full bg-emerald-500/10 items-center justify-center mb-3">
                  <Ionicons name="globe" size={28} color="#059669" />
                </View>
                <Text className="text-ios-dark text-lg font-bold">
                  {firstName} {lastName}
                </Text>
                <Text className="text-ios-grey4 text-sm">
                  {country} • {bankName}
                </Text>
              </View>
              <View
                className="bg-white rounded-3xl border border-ios-border p-5 mb-6"
                style={styles.cardShadow}
              >
                <Text className="text-ios-grey4 text-sm mb-3 text-center">
                  Enter amount to send (USD)
                </Text>
                <View className="flex-row items-center justify-center">
                  <Text className="text-ios-dark text-4xl font-bold">$</Text>
                  <TextInput
                    value={formattedAmount}
                    onChangeText={handleAmountChange}
                    placeholder="0.00"
                    keyboardType="number-pad"
                    className="text-ios-dark text-4xl font-bold ml-1"
                    placeholderTextColor="#C7C7CC"
                    style={{ minWidth: 120 }}
                    autoFocus
                    selection={{
                      start: formattedAmount.length,
                      end: formattedAmount.length,
                    }}
                  />
                </View>
              </View>
              <GlassButton
                title={`Continue — $${formattedAmount}`}
                onPress={handleAmountContinue}
                size="lg"
                fullWidth
                icon={
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                }
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // Step 5: Confirmation + Source account selection + PIN
  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center px-5 pt-2 pb-3">
          <TouchableOpacity
            onPress={() => setStep("amount")}
            className="w-10 h-10 rounded-full bg-white border border-ios-border items-center justify-center mr-3"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#1C1C1E" />
          </TouchableOpacity>
          <Text className="text-ios-dark text-xl font-bold">
            Review & Confirm
          </Text>
        </View>
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Summary Card */}
          <View
            className="bg-white rounded-3xl border border-ios-border p-5 mt-2 mb-4"
            style={styles.cardShadow}
          >
            <View className="mb-4 pb-4 border-b border-ios-border">
              <Text className="text-ios-grey4 text-xs mb-1">Recipient</Text>
              <Text className="text-ios-dark font-bold text-base">
                {firstName} {lastName}
                {nickname ? ` (${nickname})` : ""}
              </Text>
              <Text className="text-ios-grey4 text-sm mt-0.5">{country}</Text>
              <Text className="text-ios-grey4 text-sm">
                {address}, {city} {zipCode}
              </Text>
            </View>
            <View className="mb-4 pb-4 border-b border-ios-border">
              <Text className="text-ios-grey4 text-xs mb-1">
                Recipient Bank
              </Text>
              <Text className="text-ios-dark font-semibold text-base">
                {bankName}
              </Text>
              <Text className="text-ios-grey4 text-sm">
                Account •••• {recipientAccountLast4}
              </Text>
              <Text className="text-ios-grey4 text-sm">
                SWIFT: {swiftCode}
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-ios-grey4 text-sm">Amount</Text>
              <Text className="text-ios-dark text-3xl font-bold mt-1">
                {formatCurrency(parsedAmount)}
              </Text>
            </View>
          </View>

          {/* Source Account Selection */}
          <Text className="text-ios-dark font-semibold text-base mb-3">
            Send from
          </Text>
          {bankSources && bankSources.length > 0 ? (
            bankSources.map((account) => (
              <TouchableOpacity
                key={account._id}
                activeOpacity={0.7}
                onPress={() => setSourceAccountId(account._id)}
                className="mb-3"
              >
                <View
                  className={`rounded-2xl border p-4 flex-row items-center ${
                    sourceAccountId === account._id
                      ? "bg-purple-50 border-purple-300"
                      : "bg-white border-ios-border"
                  }`}
                  style={styles.cardShadow}
                >
                  <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-3">
                    <Ionicons
                      name="business-outline"
                      size={24}
                      color="#7C3AED"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-ios-dark font-semibold text-base">
                      {account.bankName}
                    </Text>
                    <Text className="text-ios-grey4 text-sm mt-0.5">
                      Account •••• {account.accountLast4}
                    </Text>
                  </View>
                  {sourceAccountId === account._id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#7C3AED"
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View
              className="bg-white rounded-2xl border border-ios-border p-6 items-center mb-4"
              style={styles.cardShadow}
            >
              <Ionicons
                name="alert-circle-outline"
                size={32}
                color="#FF9500"
              />
              <Text className="text-ios-grey4 text-sm mt-2 text-center">
                No bank accounts available.
              </Text>
            </View>
          )}

          <View className="mt-4">
            <GlassButton
              title={processing ? "Processing..." : "Continue"}
              onPress={requestVerification}
              loading={processing}
              disabled={!sourceAccountId}
              size="lg"
              fullWidth
              icon={
                <Ionicons
                  name="shield-checkmark"
                  size={20}
                  color="#FFFFFF"
                />
              }
              className="mb-3"
            />
            <GlassButton
              title="Cancel"
              onPress={() => router.back()}
              variant="secondary"
              size="lg"
              fullWidth
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* PIN Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowPinModal(false);
          setPin("");
          setPinError("");
        }}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View
            className="bg-white rounded-3xl w-full px-6 pt-6 pb-8"
            style={styles.cardShadow}
          >
            <View className="items-center mb-5">
              <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-3">
                <Ionicons name="lock-closed" size={28} color="#7C3AED" />
              </View>
              <Text className="text-ios-dark text-lg font-bold">
                Enter Account PIN
              </Text>
              <Text className="text-ios-grey4 text-sm mt-1 text-center">
                Enter the PIN for {sourceAccount?.bankName} ••••{" "}
                {sourceAccount?.accountLast4}
              </Text>
            </View>

            <View className="flex-row justify-center gap-3 mb-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <View
                  key={i}
                  className={`w-4 h-4 rounded-full ${
                    i < pin.length ? "bg-purple-600" : "bg-ios-border"
                  }`}
                />
              ))}
            </View>

            {pinError ? (
              <Text className="text-danger text-xs text-center mt-1 mb-2">
                {pinError}
              </Text>
            ) : (
              <View className="h-5 mt-1 mb-2" />
            )}

            <View className="items-center">
              {[[1, 2, 3], [4, 5, 6], [7, 8, 9], [null, 0, "del"]].map(
                (row, ri) => (
                  <View key={ri} className="flex-row gap-4 mb-3">
                    {row.map((key, ki) => {
                      if (key === null) {
                        return (
                          <View key={`empty-${ki}`} className="w-20 h-14" />
                        );
                      }
                      if (key === "del") {
                        return (
                          <TouchableOpacity
                            key="del"
                            onPress={() => {
                              setPin((p) => p.slice(0, -1));
                              setPinError("");
                            }}
                            className="w-20 h-14 rounded-2xl bg-ios-bg items-center justify-center"
                          >
                            <Ionicons
                              name="backspace-outline"
                              size={24}
                              color="#8E8E93"
                            />
                          </TouchableOpacity>
                        );
                      }
                      return (
                        <TouchableOpacity
                          key={key}
                          onPress={() => {
                            const next = pin + String(key);
                            if (next.length <= 6) {
                              setPin(next);
                              setPinError("");
                              if (next.length === 6) {
                                handlePinSubmit(next);
                              }
                            }
                          }}
                          className="w-20 h-14 rounded-2xl bg-ios-bg items-center justify-center"
                        >
                          <Text className="text-ios-dark text-xl font-semibold">
                            {key}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )
              )}
            </View>

            <TouchableOpacity
              onPress={() => {
                setShowPinModal(false);
                setPin("");
                setPinError("");
              }}
              className="mt-4"
            >
              <Text className="text-ios-grey4 text-center font-medium">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  flagEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
});
