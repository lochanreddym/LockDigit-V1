import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Share,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { BillCard, TransactionItem } from "@/components/payments";
import { EmptyState } from "@/components/common";
import { formatCurrency } from "@/lib/utils";
import { useFirebaseSessionReady } from "@/hooks/useFirebaseSessionReady";
import { LinearGradient } from "expo-linear-gradient";

type FilterType = "all" | "completed" | "pending" | "failed";
type TransactionListItem = {
  _id: string;
  type: "payment" | "scan_to_pay" | "bill_payment" | "transfer" | "wire_transfer";
  amount: number;
  description: string;
  merchantName?: string;
  status: "pending" | "completed" | "failed";
  createdAt: number;
};

const TransactionRow = React.memo(function TransactionRow({
  transaction,
  senderName,
  onPress,
}: {
  transaction: TransactionListItem;
  senderName: string;
  onPress: (transactionId: string) => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => onPress(transaction._id)}>
      <TransactionItem
        type={transaction.type}
        amount={transaction.amount}
        description={transaction.description}
        merchantName={transaction.merchantName}
        status={transaction.status}
        createdAt={transaction.createdAt}
        senderName={senderName}
        transactionId={transaction._id}
      />
    </TouchableOpacity>
  );
});

function escapeCsvCell(value: string | number | undefined | null): string {
  const str = value === undefined || value === null ? "" : String(value);
  const normalized = str.replace(/\r?\n/g, " ").trim();
  const needsPrefix = /^[=+\-@|]/.test(normalized);
  const prefixed = needsPrefix ? `'${normalized}` : normalized;
  const escaped = prefixed.replace(/"/g, '""');
  return `"${escaped}"`;
}

export default function PaymentsScreen() {
  const router = useRouter();
  const { hasUser: firebaseHasUser } = useFirebaseSessionReady();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const bills = useQuery(api.bills.listMine, firebaseHasUser ? {} : "skip");
  const transactions = useQuery(api.payments.listMine, firebaseHasUser ? {} : "skip");
  const totalDue = useQuery(api.bills.getTotalDueMine, firebaseHasUser ? {} : "skip");
  const user = useQuery(api.users.getMe, firebaseHasUser ? {} : "skip");

  const senderName = user?.name?.trim() || "User";

  const completedTransactions =
    transactions?.filter((transaction) => transaction.status === "completed") ?? [];
  const totalSpent = completedTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0
  );
  const transactionItems = (transactions ?? []) as TransactionListItem[];
  const filteredTransactions =
    activeFilter === "all"
      ? transactionItems
      : transactionItems.filter((transaction) => transaction.status === activeFilter);

  const filters: { key: FilterType; label: string }[] = useMemo(
    () => [
      { key: "all", label: "All" },
      { key: "completed", label: "Completed" },
      { key: "pending", label: "Pending" },
      { key: "failed", label: "Failed" },
    ],
    []
  );

  const handleExportTransactions = async () => {
    if (filteredTransactions.length === 0) {
      Alert.alert("No Data", "No transactions to export.");
      return;
    }

    const header = "Date,Type,Description,Amount,Status\n";
    const rows = filteredTransactions
      .map((transaction) =>
        [
          escapeCsvCell(new Date(transaction.createdAt).toISOString().split("T")[0]),
          escapeCsvCell(transaction.type),
          escapeCsvCell(transaction.merchantName || transaction.description || ""),
          escapeCsvCell((transaction.amount / 100).toFixed(2)),
          escapeCsvCell(transaction.status),
        ].join(",")
      )
      .join("\n");
    const csv = header + rows;

    try {
      await Share.share({
        message: csv,
        title: "LockDigit Transaction Export",
      });
    } catch {
      // user dismissed
    }
  };

  const handleTransactionPress = useCallback(
    (transactionId: string) => {
      router.push({
        pathname: "/(app)/transaction/[id]",
        params: { id: transactionId },
      });
    },
    [router]
  );

  const renderTransaction = useCallback(
    ({ item }: { item: TransactionListItem }) => (
      <TransactionRow
        transaction={item}
        senderName={senderName}
        onPress={handleTransactionPress}
      />
    ),
    [handleTransactionPress, senderName]
  );

  const transactionKeyExtractor = useCallback(
    (item: TransactionListItem) => item._id,
    []
  );

  return (
    <View className="flex-1 bg-ios-bg">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="bg-white border-b border-ios-border px-5 py-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-ios-dark">Transaction History</Text>
            {filteredTransactions.length > 0 ? (
              <TouchableOpacity
                onPress={handleExportTransactions}
                className="w-10 h-10 rounded-full bg-ios-bg border border-ios-border items-center justify-center"
              >
                <Ionicons name="share-outline" size={20} color="#0A84FF" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
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
                style={activeFilter === filter.key ? styles.filterShadow : undefined}
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
                  <Text className="text-white font-semibold">{formatCurrency(totalDue ?? 0)}</Text>
                </View>
                <View>
                  <Text className="text-white/60 text-xs">Transactions</Text>
                  <Text className="text-white font-semibold">
                    {transactionItems.length}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View className="px-5">
            {filteredTransactions.length > 0 ? (
              <View
                className="bg-white rounded-3xl border border-ios-border p-4"
                style={styles.cardShadow}
              >
                <FlatList
                  data={filteredTransactions}
                  renderItem={renderTransaction}
                  keyExtractor={transactionKeyExtractor}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                  removeClippedSubviews={false}
                  initialNumToRender={8}
                  maxToRenderPerBatch={12}
                  windowSize={5}
                />
              </View>
            ) : (
              <EmptyState
                icon="card-outline"
                title="No Transactions"
                description="No transactions for this status."
              />
            )}
          </View>

          {bills && bills.length > 0 ? (
            <View className="px-5 mt-5">
              <Text className="text-ios-dark font-semibold text-lg mb-3">Your Bills</Text>
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
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
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

