import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { formatCents } from "@/lib/utils";
import { Colors, Spacing } from "@/constants/theme";

export default function RefereeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [pendingWeighIns, setPendingWeighIns] = useState<any[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadData = useCallback(async () => {
    if (!user) return;

    // Get contracts where user is referee
    const { data: contracts } = await supabase
      .from("contracts")
      .select("id")
      .eq("referee_id", user.id);

    const ids = (contracts || []).map((c: any) => c.id);
    if (ids.length === 0) {
      setPendingWeighIns([]);
      return;
    }

    // Get pending weigh-ins
    const { data: pending } = await supabase
      .from("weigh_ins")
      .select("*, contracts(participant_id, profiles!contracts_participant_id_fkey(full_name, email))")
      .in("contract_id", ids)
      .eq("verification_status", "pending")
      .order("submitted_at", { ascending: false });

    setPendingWeighIns(pending || []);

    // Get earnings
    const { data: ledger } = await supabase
      .from("ledger_entries")
      .select("amount_cents")
      .in("contract_id", ids)
      .eq("direction", "debit")
      .in("status", ["earned", "released"]);

    setTotalEarned((ledger || []).reduce((s: number, e: any) => s + e.amount_cents, 0));
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  async function handleVerify(weighInId: string, status: "approved" | "rejected") {
    if (!user) return;

    const { error } = await supabase
      .from("weigh_ins")
      .update({
        verification_status: status,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        rejection_reason: status === "rejected" ? rejectReason : null,
      })
      .eq("id", weighInId);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    // If approved, update contract's current_verified_weight
    if (status === "approved") {
      const wi = pendingWeighIns.find((w) => w.id === weighInId);
      if (wi) {
        const { data: contract } = await supabase
          .from("contracts")
          .select("current_verified_weight")
          .eq("id", wi.contract_id)
          .single();

        if (contract && (contract.current_verified_weight === null || wi.weight_lbs < contract.current_verified_weight)) {
          await supabase
            .from("contracts")
            .update({ current_verified_weight: wi.weight_lbs })
            .eq("id", wi.contract_id);
        }
      }
    }

    setRejectingId(null);
    setRejectReason("");
    await loadData();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Referee Panel</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="wallet-outline" size={20} color={Colors.emerald} />
            <Text style={styles.statAmount}>{formatCents(totalEarned)}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={20} color={Colors.amber} />
            <Text style={styles.statAmount}>{pendingWeighIns.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Pending Verification</Text>

        {pendingWeighIns.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color={Colors.emeraldLight} />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>No weigh-ins need your review.</Text>
          </View>
        ) : (
          pendingWeighIns.map((wi) => {
            const participant = wi.contracts?.profiles;
            const name = participant?.full_name || participant?.email || "Participant";

            return (
              <View key={wi.id} style={styles.verifyCard}>
                <View style={styles.verifyHeader}>
                  <View>
                    <Text style={styles.verifyName}>{name}</Text>
                    <Text style={styles.verifyDate}>
                      {new Date(wi.submitted_at).toLocaleString()}
                    </Text>
                  </View>
                  <Text style={styles.verifyWeight}>{wi.weight_lbs} lb</Text>
                </View>

                {wi.note && (
                  <Text style={styles.verifyNote}>{wi.note}</Text>
                )}

                {rejectingId === wi.id ? (
                  <View style={styles.rejectSection}>
                    <TextInput
                      style={styles.rejectInput}
                      placeholder="Reason (optional)"
                      placeholderTextColor={Colors.textMuted}
                      value={rejectReason}
                      onChangeText={setRejectReason}
                    />
                    <View style={styles.rejectActions}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => { setRejectingId(null); setRejectReason(""); }}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.confirmRejectButton}
                        onPress={() => handleVerify(wi.id, "rejected")}
                      >
                        <Text style={styles.confirmRejectText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.verifyActions}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => handleVerify(wi.id, "approved")}
                    >
                      <Ionicons name="checkmark" size={18} color="white" />
                      <Text style={styles.approveText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => setRejectingId(wi.id)}
                    >
                      <Ionicons name="close" size={18} color={Colors.red} />
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
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
  statsRow: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.xxl },
  statCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 16, padding: Spacing.lg,
    alignItems: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  statAmount: { fontSize: 24, fontWeight: "700", color: Colors.text, marginTop: 4 },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: "600", color: Colors.text, marginBottom: Spacing.md },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: Colors.text, marginTop: Spacing.md },
  emptyText: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  verifyCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: Spacing.lg,
    marginBottom: Spacing.md, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  verifyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  verifyName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  verifyDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  verifyWeight: { fontSize: 22, fontWeight: "700", color: Colors.text },
  verifyNote: {
    fontSize: 13, color: Colors.textSecondary, backgroundColor: Colors.background,
    borderRadius: 8, padding: Spacing.md, marginTop: Spacing.md,
  },
  verifyActions: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg },
  approveButton: {
    flex: 1, flexDirection: "row", height: 44, backgroundColor: Colors.emerald,
    borderRadius: 12, justifyContent: "center", alignItems: "center", gap: 6,
  },
  approveText: { fontSize: 14, fontWeight: "600", color: "white" },
  rejectButton: {
    flex: 1, flexDirection: "row", height: 44, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, justifyContent: "center", alignItems: "center", gap: 6, backgroundColor: Colors.card,
  },
  rejectButtonText: { fontSize: 14, fontWeight: "500", color: Colors.red },
  rejectSection: { marginTop: Spacing.md },
  rejectInput: {
    height: 40, borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: Spacing.md, fontSize: 14, color: Colors.text, marginBottom: Spacing.sm,
  },
  rejectActions: { flexDirection: "row", gap: Spacing.sm },
  cancelButton: {
    flex: 1, height: 40, borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    justifyContent: "center", alignItems: "center", backgroundColor: Colors.card,
  },
  cancelButtonText: { fontSize: 14, color: Colors.text },
  confirmRejectButton: {
    flex: 1, height: 40, backgroundColor: Colors.red, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },
  confirmRejectText: { fontSize: 14, fontWeight: "600", color: "white" },
});
