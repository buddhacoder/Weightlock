import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { formatCents } from "@/lib/utils";
import { Colors, Spacing } from "@/constants/theme";

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [contract, setContract] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [weighIns, setWeighIns] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [{ data: c }, { data: m }, { data: w }] = await Promise.all([
      supabase.from("contracts").select("*").eq("id", id).single(),
      supabase.from("milestones").select("*").eq("contract_id", id).order("threshold_lbs"),
      supabase.from("weigh_ins").select("*").eq("contract_id", id).order("submitted_at", { ascending: false }).limit(10),
    ]);
    if (c) setContract(c);
    if (m) setMilestones(m);
    if (w) setWeighIns(w);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (!contract) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const weightLost = contract.current_verified_weight
    ? contract.start_weight - contract.current_verified_weight
    : 0;
  const progress = Math.min(100, (weightLost / contract.target_weight_loss) * 100);

  const triggeredMilestones = milestones.filter((m) => m.status === "triggered" || m.status === "paid");
  const pendingVerifications = weighIns.filter((w) => w.verification_status === "pending").length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{contract.target_weight_loss} lb Goal</Text>
        <View
          style={[
            styles.statusBadge,
            contract.status === "active" ? styles.badgeActive : styles.badgePending,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              contract.status === "active" ? styles.statusActive : styles.statusPending,
            ]}
          >
            {contract.status}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Big number */}
        <View style={styles.heroCard}>
          <Text style={styles.heroNumber}>{weightLost.toFixed(1)}</Text>
          <Text style={styles.heroUnit}>pounds lost</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.heroSub}>
            {contract.current_verified_weight?.toFixed(1) || contract.start_weight} lb current
            → {(contract.start_weight - contract.target_weight_loss).toFixed(0)} lb goal
          </Text>
        </View>

        {/* Metric cards */}
        <View style={styles.metricRow}>
          <View style={[styles.metricCard, styles.metricRed]}>
            <Ionicons name="alert-circle-outline" size={20} color={Colors.red} />
            <Text style={styles.metricValue}>
              {formatCents(Math.min(contract.weekly_reward_cents, contract.weekly_pool_cents))}
            </Text>
            <Text style={styles.metricLabel}>at risk this week</Text>
          </View>
          <View style={[styles.metricCard, styles.metricGreen]}>
            <Ionicons name="trophy-outline" size={20} color={Colors.emerald} />
            <Text style={styles.metricValue}>{triggeredMilestones.length}</Text>
            <Text style={styles.metricLabel}>milestones hit</Text>
          </View>
        </View>

        {/* Quick actions */}
        {contract.status === "active" && (
          <TouchableOpacity
            style={styles.weighInButton}
            onPress={() => router.push(`/contract/${id}/weigh-in`)}
            activeOpacity={0.8}
          >
            <Ionicons name="scale-outline" size={22} color="white" />
            <Text style={styles.weighInButtonText}>Log Weigh-In</Text>
            {pendingVerifications > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingVerifications} pending</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Recent weigh-ins */}
        <Text style={styles.sectionTitle}>Recent Weigh-Ins</Text>
        {weighIns.length === 0 ? (
          <Text style={styles.emptyText}>No weigh-ins yet</Text>
        ) : (
          weighIns.slice(0, 5).map((wi) => (
            <View key={wi.id} style={styles.weighInRow}>
              <View style={styles.weighInLeft}>
                <Text style={styles.weighInWeight}>{wi.weight_lbs} lb</Text>
                <Text style={styles.weighInDate}>
                  {new Date(wi.submitted_at).toLocaleDateString()}
                </Text>
              </View>
              <View
                style={[
                  styles.verifyBadge,
                  wi.verification_status === "approved"
                    ? styles.badgeApproved
                    : wi.verification_status === "rejected"
                    ? styles.badgeRejected
                    : styles.badgeWaiting,
                ]}
              >
                <Text
                  style={[
                    styles.verifyText,
                    wi.verification_status === "approved"
                      ? { color: Colors.emeraldDark }
                      : wi.verification_status === "rejected"
                      ? { color: Colors.red }
                      : { color: Colors.amber },
                  ]}
                >
                  {wi.verification_status}
                </Text>
              </View>
            </View>
          ))
        )}

        {/* Milestones */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xxl }]}>Milestones</Text>
        {milestones.map((m) => {
          const hit = m.status === "triggered" || m.status === "paid";
          return (
            <View key={m.id} style={[styles.milestoneRow, hit && styles.milestoneHit]}>
              <View style={[styles.milestoneIcon, hit && styles.milestoneIconHit]}>
                <Ionicons
                  name={hit ? "checkmark" : "flag-outline"}
                  size={16}
                  color={hit ? "white" : Colors.textMuted}
                />
              </View>
              <Text style={[styles.milestoneText, hit && styles.milestoneTextHit]}>
                {m.threshold_lbs} lb lost
              </Text>
              <Text style={[styles.milestoneAmount, hit && { color: Colors.emerald }]}>
                {formatCents(m.payout_cents + m.bonus_payout_cents)}
              </Text>
            </View>
          );
        })}

        {/* Nav links */}
        <View style={styles.navLinks}>
          <TouchableOpacity
            style={styles.navLink}
            onPress={() => router.push(`/contract/${id}/wallet`)}
          >
            <Ionicons name="wallet-outline" size={20} color={Colors.emerald} />
            <Text style={styles.navLinkText}>Wallet</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navLink}
            onPress={() => router.push(`/contract/${id}/history`)}
          >
            <Ionicons name="time-outline" size={20} color={Colors.purple} />
            <Text style={styles.navLinkText}>History</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: Colors.textSecondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: Colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: Colors.emeraldLight },
  badgePending: { backgroundColor: Colors.amberLight },
  statusText: { fontSize: 12, fontWeight: "600" },
  statusActive: { color: Colors.emeraldDark },
  statusPending: { color: Colors.amber },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.xl, paddingBottom: 40 },
  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: Spacing.xxl,
    alignItems: "center",
    marginBottom: Spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  heroNumber: { fontSize: 56, fontWeight: "800", color: Colors.emerald },
  heroUnit: { fontSize: 16, color: Colors.textSecondary, marginBottom: Spacing.lg },
  progressBar: {
    width: "100%",
    height: 10,
    backgroundColor: Colors.skeleton,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.emerald,
    borderRadius: 5,
  },
  heroSub: { fontSize: 13, color: Colors.textMuted, marginTop: Spacing.sm },
  metricRow: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.xl },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.lg,
    alignItems: "center",
  },
  metricRed: { borderWidth: 1, borderColor: "#FECACA" },
  metricGreen: { borderWidth: 1, borderColor: "#A7F3D0" },
  metricValue: { fontSize: 20, fontWeight: "700", color: Colors.text, marginTop: 4 },
  metricLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  weighInButton: {
    flexDirection: "row",
    height: 52,
    backgroundColor: Colors.emerald,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: Spacing.xxl,
  },
  weighInButtonText: { fontSize: 16, fontWeight: "600", color: "white" },
  pendingBadge: { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  pendingBadgeText: { fontSize: 11, color: "white", fontWeight: "500" },
  sectionTitle: { fontSize: 17, fontWeight: "600", color: Colors.text, marginBottom: Spacing.md },
  emptyText: { fontSize: 14, color: Colors.textMuted, marginBottom: Spacing.lg },
  weighInRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  weighInLeft: {},
  weighInWeight: { fontSize: 16, fontWeight: "600", color: Colors.text },
  weighInDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  verifyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeApproved: { backgroundColor: Colors.emeraldLight },
  badgeRejected: { backgroundColor: Colors.redLight },
  badgeWaiting: { backgroundColor: Colors.amberLight },
  verifyText: { fontSize: 12, fontWeight: "500" },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
    marginBottom: 6,
  },
  milestoneHit: { backgroundColor: Colors.emeraldLight },
  milestoneIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.skeleton,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  milestoneIconHit: { backgroundColor: Colors.emerald },
  milestoneText: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  milestoneTextHit: { color: Colors.emeraldDark, fontWeight: "500" },
  milestoneAmount: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  navLinks: { marginTop: Spacing.xxl, gap: Spacing.sm },
  navLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  navLinkText: { flex: 1, fontSize: 15, fontWeight: "500", color: Colors.text },
});
