import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { formatCents } from "@/lib/utils";
import { Colors, Spacing } from "@/constants/theme";

export default function WalletScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [contract, setContract] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: l }] = await Promise.all([
        supabase.from("contracts").select("*").eq("id", id).single(),
        supabase.from("ledger_entries").select("*").eq("contract_id", id).order("created_at", { ascending: false }),
      ]);
      if (c) setContract(c);
      if (l) setLedger(l);
    }
    load();
  }, [id]);

  if (!contract) return null;

  // Compute pool balances
  const pools = [
    { label: "Weekly", allocated: contract.weekly_pool_cents, color: Colors.blue },
    { label: "Milestone", allocated: contract.milestone_pool_cents, color: Colors.emerald },
    { label: "Penalty", allocated: contract.penalty_pool_cents, color: Colors.red },
    { label: "Completion", allocated: contract.completion_pool_cents, color: Colors.purple },
  ].map((p) => {
    const poolType = `${p.label.toLowerCase()}_pool`;
    const spent = ledger
      .filter((e: any) => e.pool_type === poolType && e.direction === "debit" && (e.status === "earned" || e.status === "released"))
      .reduce((sum: number, e: any) => sum + e.amount_cents, 0);
    return { ...p, spent, remaining: p.allocated - spent };
  });

  const totalReleased = pools.reduce((s, p) => s + p.spent, 0);
  const totalRemaining = contract.total_deposit_cents - totalReleased;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.summaryAmount}>{formatCents(totalRemaining)}</Text>
            <Text style={styles.summaryLabel}>Locked</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="lock-open-outline" size={20} color={Colors.emerald} />
            <Text style={[styles.summaryAmount, { color: Colors.emerald }]}>{formatCents(totalReleased)}</Text>
            <Text style={styles.summaryLabel}>Released</Text>
          </View>
        </View>

        {/* Pools */}
        <Text style={styles.sectionTitle}>Pools</Text>
        {pools.map((p) => (
          <View key={p.label} style={styles.poolCard}>
            <View style={styles.poolHeader}>
              <View style={[styles.poolDot, { backgroundColor: p.color }]} />
              <Text style={styles.poolName}>{p.label}</Text>
              <Text style={styles.poolBalance}>{formatCents(p.remaining)}</Text>
            </View>
            <View style={styles.poolBar}>
              <View
                style={[
                  styles.poolBarFill,
                  {
                    backgroundColor: p.color,
                    width: `${p.allocated > 0 ? (p.remaining / p.allocated) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.poolSub}>{formatCents(p.spent)} of {formatCents(p.allocated)} released</Text>
          </View>
        ))}

        {/* Transactions */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xxl }]}>Transactions</Text>
        {ledger.map((entry: any) => (
          <View key={entry.id} style={styles.txRow}>
            <View>
              <Text style={styles.txType}>{entry.entry_type.replace(/_/g, " ")}</Text>
              <Text style={styles.txDate}>{new Date(entry.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.txAmount, entry.direction === "credit" ? styles.txCredit : styles.txDebit]}>
              {entry.direction === "credit" ? "+" : "-"}{formatCents(entry.amount_cents)}
            </Text>
          </View>
        ))}
        {ledger.length === 0 && <Text style={styles.emptyText}>No transactions yet</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: Spacing.lg,
    backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: Colors.text },
  scrollContent: { padding: Spacing.xl, paddingBottom: 40 },
  summaryRow: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.xxl },
  summaryCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 16, padding: Spacing.lg,
    alignItems: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  summaryAmount: { fontSize: 22, fontWeight: "700", color: Colors.text, marginTop: 4 },
  summaryLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: "600", color: Colors.text, marginBottom: Spacing.md },
  poolCard: {
    backgroundColor: Colors.card, borderRadius: 12, padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  poolHeader: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm },
  poolDot: { width: 10, height: 10, borderRadius: 5, marginRight: Spacing.sm },
  poolName: { flex: 1, fontSize: 14, fontWeight: "500", color: Colors.text },
  poolBalance: { fontSize: 14, fontWeight: "600", color: Colors.text },
  poolBar: { height: 6, backgroundColor: Colors.skeleton, borderRadius: 3, overflow: "hidden" },
  poolBarFill: { height: "100%", borderRadius: 3 },
  poolSub: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  txRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  txType: { fontSize: 14, fontWeight: "500", color: Colors.text, textTransform: "capitalize" },
  txDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: "600" },
  txCredit: { color: Colors.emerald },
  txDebit: { color: Colors.red },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: "center", paddingVertical: Spacing.xl },
});
