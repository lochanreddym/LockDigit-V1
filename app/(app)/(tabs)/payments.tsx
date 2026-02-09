import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ScreenWrapper, Header, EmptyState } from "@/components/common";
import { GlassCard, GlassButton, GlassInput } from "@/components/glass";
import { BillCard, TransactionItem } from "@/components/payments";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import { Config } from "@/constants/Config";

export default function PaymentsScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const convexUserId = userId as Id<"users"> | null;

  const [activeTab, setActiveTab] = useState<"bills" | "transactions">("bills");
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
  const bankAccounts = useQuery(
    api.payments.listBankAccounts,
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
        amount: Math.round(parseFloat(billAmount) * 100), // Convert to cents
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

  const pendingBills = bills?.filter((b) => b.status !== "paid") ?? [];
  const paidBills = bills?.filter((b) => b.status === "paid") ?? [];

  return (
    <ScreenWrapper>
      <Header
        title="Payments"
        rightAction={{
          icon: "add-circle-outline",
          onPress: () => setShowAddBill(true),
        }}
      />

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Financial Summary */}
        <GlassCard className="mb-5">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white/60 text-sm">Total Outstanding</Text>
              <Text className="text-white text-3xl font-bold mt-1">
                {formatCurrency(totalDue ?? 0)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(app)/scan-to-pay")}
              className="w-14 h-14 rounded-2xl bg-primary items-center justify-center"
            >
              <Ionicons name="qr-code" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Bank accounts summary */}
          {bankAccounts && bankAccounts.length > 0 && (
            <View className="mt-4 pt-4 border-t border-white/10">
              <Text className="text-white/50 text-xs mb-2">
                Payment Methods
              </Text>
              <View className="flex-row gap-2">
                {bankAccounts.map((account) => (
                  <View
                    key={account._id}
                    className="flex-row items-center bg-white/5 rounded-lg px-3 py-1.5"
                  >
                    <Ionicons
                      name="card-outline"
                      size={14}
                      color="rgba(255,255,255,0.5)"
                    />
                    <Text className="text-white/60 text-xs ml-1.5">
                      {account.bankName} ****{account.accountLast4}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </GlassCard>

        {/* Tab Selector */}
        <View className="flex-row mb-4 bg-white/5 rounded-xl p-1">
          <TouchableOpacity
            onPress={() => setActiveTab("bills")}
            className={`flex-1 py-2.5 rounded-lg ${activeTab === "bills" ? "bg-primary" : ""}`}
          >
            <Text
              className={`text-center font-semibold text-sm ${
                activeTab === "bills" ? "text-white" : "text-white/50"
              }`}
            >
              Bills ({pendingBills.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("transactions")}
            className={`flex-1 py-2.5 rounded-lg ${activeTab === "transactions" ? "bg-primary" : ""}`}
          >
            <Text
              className={`text-center font-semibold text-sm ${
                activeTab === "transactions" ? "text-white" : "text-white/50"
              }`}
            >
              Transactions
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === "bills" ? (
          <>
            {pendingBills.length > 0 ? (
              <>
                <Text className="text-white/60 text-sm font-medium uppercase tracking-wider mb-2">
                  Pending & Overdue
                </Text>
                {pendingBills.map((bill) => (
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

                {paidBills.length > 0 && (
                  <>
                    <Text className="text-white/60 text-sm font-medium uppercase tracking-wider mb-2 mt-4">
                      Paid
                    </Text>
                    {paidBills.slice(0, 5).map((bill) => (
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
                  </>
                )}
              </>
            ) : (
              <EmptyState
                icon="receipt-outline"
                title="No Bills Yet"
                description="Add your bills to track payments and get reminders."
                action={
                  <GlassButton
                    title="Add a Bill"
                    onPress={() => setShowAddBill(true)}
                    variant="primary"
                    size="md"
                  />
                }
              />
            )}
          </>
        ) : (
          <>
            {transactions && transactions.length > 0 ? (
              <GlassCard>
                {transactions.map((tx) => (
                  <TransactionItem
                    key={tx._id}
                    type={tx.type}
                    amount={tx.amount}
                    description={tx.description}
                    merchantName={tx.merchantName}
                    status={tx.status}
                    createdAt={tx.createdAt}
                  />
                ))}
              </GlassCard>
            ) : (
              <EmptyState
                icon="card-outline"
                title="No Transactions Yet"
                description="Your payment history will appear here."
              />
            )}
          </>
        )}
      </ScrollView>

      {/* Add Bill Modal */}
      <Modal
        visible={showAddBill}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddBill(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-dark rounded-t-3xl px-5 pt-6 pb-10">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-white text-xl font-bold">Add New Bill</Text>
              <TouchableOpacity onPress={() => setShowAddBill(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

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

            <Text className="text-sm text-white/70 mb-2 font-medium">
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
                      ? "bg-primary/20 border-primary"
                      : "bg-white/5 border-glass-border"
                  }`}
                >
                  <Text
                    className={`text-sm capitalize ${
                      billCategory === cat ? "text-primary" : "text-white/60"
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
                    : "border-glass-border"
                }`}
              >
                {billRecurring && (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                )}
              </View>
              <Text className="text-white text-base">Recurring bill</Text>
            </TouchableOpacity>

            <GlassButton
              title={creating ? "Creating..." : "Add Bill"}
              onPress={handleCreateBill}
              loading={creating}
              disabled={!billTitle || !billAmount || !billCategory}
              size="lg"
            />
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}
