import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassButton, GlassInput } from "@/components/glass";
import { BillCard, TransactionItem } from "@/components/payments";
import { EmptyState } from "@/components/common";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import { Config } from "@/constants/Config";
import { LinearGradient } from "expo-linear-gradient";

type FilterType = "all" | "completed" | "pending";

export default function PaymentsScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [showAddBill, setShowAddBill] = useState(false);
  const [billTitle, setBillTitle] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billCategory, setBillCategory] = useState("");
  const [billDueDate, setBillDueDate] = useState("");
  const [billRecurring, setBillRecurring] = useState(false);
  const [creating, setCreating] = useState(false);

  const bills = useQuery(
    api.bills.listByUser,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const transactions = useQuery(
    api.payments.getTransactionsByUser,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const totalDue = useQuery(
    api.bills.getTotalDue,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  const createBill = useMutation(api.bills.create);

  const handleCreateBill = async () => {
    if (!convexUserId || !billTitle || !billAmount || !billCategory) {
      Alert.alert("Missing Info", "Please fill in all required fields.");
      return;
    }

    setCreating(true);
    try {
      await createBill({
        userId: convexUserId,
        title: billTitle,
        category: billCategory,
        amount: Math.round(parseFloat(billAmount) * 100),
        dueDate: billDueDate
          ? new Date(billDueDate).getTime()
          : Date.now() + 30 * 24 * 60 * 60 * 1000,
        recurring: billRecurring,
      });

      setShowAddBill(false);
      setBillTitle("");
      setBillAmount("");
      setBillCategory("");
      setBillDueDate("");
      setBillRecurring(false);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to create bill.");
    } finally {
      setCreating(false);
    }
  };

  // Calculate totals
  const completedTransactions =
    transactions?.filter((t) => t.status === "completed") ?? [];
  const totalSpent = completedTransactions.reduce(
    (sum, t) => sum + t.amount,
    0
  );

  const filteredTransactions =
    activeFilter === "all"
      ? transactions
      : transactions?.filter((t) => t.status === activeFilter);

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "completed", label: "Completed" },
    { key: "pending", label: "Pending" },
  ];

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="bg-white border-b border-ios-border px-5 py-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-ios-dark">
              Transaction History
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddBill(true)}
              className="w-10 h-10 rounded-full bg-primary items-center justify-center"
              style={styles.addShadow}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Filter Pills */}
          <View className="flex-row px-5 pt-4 pb-3 gap-2">
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                onPress={() => setActiveFilter(filter.key)}
                className={`px-4 py-2 rounded-full ${
                  activeFilter === filter.key
                    ? "bg-primary"
                    : "bg-white border border-ios-border"
                }`}
                style={
                  activeFilter === filter.key ? styles.filterShadow : undefined
                }
              >
                <Text
                  className={`text-sm font-medium ${
                    activeFilter === filter.key ? "text-white" : "text-ios-grey4"
                  }`}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Summary Card */}
          <View className="px-5 mb-4">
            <LinearGradient
              colors={["#0A84FF", "#5E5CE6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-3xl p-5 overflow-hidden"
              style={styles.summaryCardShadow}
            >
              <View className="absolute top-3 right-3 w-16 h-16 rounded-2xl bg-white/10 rotate-12" />
              <Text className="text-white/80 text-sm">Total Spent This Month</Text>
              <Text className="text-white text-3xl font-bold mt-1">
                {formatCurrency(totalSpent)}
              </Text>
              <View className="flex-row mt-3 gap-4">
                <View>
                  <Text className="text-white/60 text-xs">Outstanding</Text>
                  <Text className="text-white font-semibold">
                    {formatCurrency(totalDue ?? 0)}
                  </Text>
                </View>
                <View>
                  <Text className="text-white/60 text-xs">Transactions</Text>
                  <Text className="text-white font-semibold">
                    {transactions?.length ?? 0}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Transaction List */}
          <View className="px-5">
            {filteredTransactions && filteredTransactions.length > 0 ? (
              <View
                className="bg-white rounded-3xl border border-ios-border p-4"
                style={styles.cardShadow}
              >
                {filteredTransactions.map((tx, index) => (
                  <View
                    key={tx._id}
                    className={
                      index < filteredTransactions.length - 1
                        ? ""
                        : ""
                    }
                  >
                    <TransactionItem
                      type={tx.type}
                      amount={tx.amount}
                      description={tx.description}
                      merchantName={tx.merchantName}
                      status={tx.status}
                      createdAt={tx.createdAt}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState
                icon="card-outline"
                title="No Transactions"
                description="Your payment history will appear here."
              />
            )}
          </View>

          {/* Bills Section */}
          {bills && bills.length > 0 && (
            <View className="px-5 mt-5">
              <Text className="text-ios-dark font-semibold text-lg mb-3">
                Your Bills
              </Text>
              {bills.slice(0, 5).map((bill) => (
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

        {/* Add Bill Modal */}
        <Modal
          visible={showAddBill}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View className="flex-1 bg-ios-bg">
            <SafeAreaView className="flex-1">
              <View className="flex-row items-center justify-between px-5 py-3 bg-white border-b border-ios-border">
                <TouchableOpacity onPress={() => setShowAddBill(false)}>
                  <Text className="text-primary text-base">Cancel</Text>
                </TouchableOpacity>
                <Text className="text-ios-dark font-semibold text-base">
                  Add New Bill
                </Text>
                <View className="w-14" />
              </View>

              <ScrollView className="flex-1 px-5 pt-4">
                <GlassInput
                  label="Bill Title"
                  placeholder="e.g., Electricity Bill"
                  value={billTitle}
                  onChangeText={setBillTitle}
                />

                <GlassInput
                  label="Amount ($)"
                  placeholder="0.00"
                  value={billAmount}
                  onChangeText={setBillAmount}
                  keyboardType="decimal-pad"
                />

                <Text className="text-sm text-ios-dark mb-2 font-medium">
                  Category
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                >
                  {Config.BILL_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setBillCategory(cat)}
                      className={`mr-3 px-4 py-2 rounded-xl border ${
                        billCategory === cat
                          ? "bg-primary/10 border-primary"
                          : "bg-white border-ios-border"
                      }`}
                    >
                      <Text
                        className={`text-sm capitalize ${
                          billCategory === cat ? "text-primary" : "text-ios-grey4"
                        }`}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <GlassInput
                  label="Due Date (YYYY-MM-DD)"
                  placeholder="2026-03-01"
                  value={billDueDate}
                  onChangeText={setBillDueDate}
                />

                <TouchableOpacity
                  onPress={() => setBillRecurring(!billRecurring)}
                  className="flex-row items-center mb-6"
                >
                  <View
                    className={`w-6 h-6 rounded-md border mr-3 items-center justify-center ${
                      billRecurring
                        ? "bg-primary border-primary"
                        : "border-ios-borderLight"
                    }`}
                  >
                    {billRecurring && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <Text className="text-ios-dark text-base">Recurring bill</Text>
                </TouchableOpacity>

                <GlassButton
                  title={creating ? "Creating..." : "Add Bill"}
                  onPress={handleCreateBill}
                  loading={creating}
                  disabled={!billTitle || !billAmount || !billCategory}
                  size="lg"
                  fullWidth
                />
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  addShadow: {
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  filterShadow: {
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryCardShadow: {
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
});
