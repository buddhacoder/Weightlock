import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { formatCents } from "@/lib/utils";
import { Colors, Spacing } from "@/constants/theme";

interface Contract {
  id: string;
  status: string;
  start_weight: number;
  current_verified_weight: number | null;
  target_weight_loss: number;
  target_duration_weeks: number;
  weigh_ins_per_week: number;
  total_deposit_cents: number;
}

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [profile, setProfile] = useState<{ full_name: string | null }>({ full_name: null });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    const [{ data: profileData }, { data: contractData }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      supabase
        .from("contracts")
        .select("*")
        .eq("participant_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (profileData) setProfile(profileData);
    if (contractData) setContracts(contractData);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const firstName = profile.full_name?.split(" ")[0];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {firstName ? `Hey, ${firstName}` : "Dashboard"}
          </Text>
          <Text style={styles.subtitle}>Your weight loss contracts</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/referee")}
          >
            <Ionicons name="people-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/settings")}
          >
            <Ionicons name="settings-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={signOut}>
            <Ionicons name="log-out-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Active contracts */}
        {contracts.map((contract) => {
          const weightLost = contract.current_verified_weight
            ? contract.start_weight - contract.current_verified_weight
            : 0;
          const progress = Math.min(100, (weightLost / contract.target_weight_loss) * 100);

          return (
            <TouchableOpacity
              key={contract.id}
              style={styles.card}
              onPress={() => router.push(`/contract/${contract.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>
                    {contract.target_weight_loss} lb Loss
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {contract.target_duration_weeks} weeks · {contract.weigh_ins_per_week}x/week
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    contract.status === "active"
                      ? styles.badgeActive
                      : contract.status === "completed"
                      ? styles.badgeComplete
                      : styles.badgePending,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      contract.status === "active"
                        ? styles.statusActive
                        : contract.status === "completed"
                        ? styles.statusComplete
                        : styles.statusPending,
                    ]}
                  >
                    {contract.status}
                  </Text>
                </View>
              </View>

              {/* Progress */}
              <View style={styles.progressSection}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>
                    {weightLost.toFixed(1)} lb lost
                  </Text>
                  <Text style={styles.progressLabel}>
                    {contract.target_weight_loss} lb goal
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: `${progress}%` }]}
                  />
                </View>
              </View>

              {/* Money */}
              <View style={styles.moneyRow}>
                <Ionicons name="wallet-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.moneyText}>
                  {formatCents(contract.total_deposit_cents)} deposited
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Empty state */}
        {contracts.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="scale-outline" size={40} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No contracts yet</Text>
            <Text style={styles.emptyText}>
              Create your first weight loss contract
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/contract/new")}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  greeting: { fontSize: 24, fontWeight: "700", color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: "row", gap: Spacing.sm },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.xl, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  cardTitle: { fontSize: 18, fontWeight: "600", color: Colors.text },
  cardSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: Colors.emeraldLight },
  badgeComplete: { backgroundColor: "#E0E7FF" },
  badgePending: { backgroundColor: Colors.amberLight },
  statusText: { fontSize: 12, fontWeight: "600" },
  statusActive: { color: Colors.emeraldDark },
  statusComplete: { color: "#4338CA" },
  statusPending: { color: Colors.amber },
  progressSection: { marginBottom: Spacing.md },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: { fontSize: 12, color: Colors.textSecondary },
  progressBar: {
    height: 8,
    backgroundColor: Colors.skeleton,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.emerald,
    borderRadius: 4,
  },
  moneyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  moneyText: { fontSize: 13, color: Colors.textSecondary },
  emptyState: { alignItems: "center", paddingTop: 80 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.skeleton,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: Colors.text },
  emptyText: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.emerald,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.emerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
