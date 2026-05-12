import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { formatCents } from "@/lib/utils";
import { Colors, Spacing } from "@/constants/theme";

const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Detroit", label: "Detroit (ET)" },
  { value: "America/Indiana/Indianapolis", label: "Indiana (ET)" },
  { value: "America/Boise", label: "Boise (MT)" },
];

export default function NewContractScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    start_weight: "220",
    target_weight_loss: "40",
    target_duration_weeks: "16",
    weigh_ins_per_week: "3",
    referee_email: "",
    timezone: "America/New_York",
    total_deposit_cents: 100000,
    weekly_pool_cents: 48000,
    milestone_pool_cents: 20000,
    penalty_pool_cents: 8000,
    completion_pool_cents: 24000,
    weekly_reward_cents: 3000,
    penalty_cents: 500,
    milestone_interval_lbs: 5,
    milestone_payout_cents: 2500,
    milestone_bonus_interval_lbs: 10,
    milestone_bonus_cents: 2500,
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate() {
    if (!user) return;
    setLoading(true);

    const { data: contract, error } = await supabase
      .from("contracts")
      .insert({
        participant_id: user.id,
        status: "pending_funding",
        start_weight: Number(form.start_weight),
        current_verified_weight: Number(form.start_weight),
        target_weight_loss: Number(form.target_weight_loss),
        target_duration_weeks: Number(form.target_duration_weeks),
        weigh_ins_per_week: Number(form.weigh_ins_per_week),
        total_deposit_cents: form.total_deposit_cents,
        weekly_pool_cents: form.weekly_pool_cents,
        milestone_pool_cents: form.milestone_pool_cents,
        penalty_pool_cents: form.penalty_pool_cents,
        completion_pool_cents: form.completion_pool_cents,
        weekly_reward_cents: form.weekly_reward_cents,
        penalty_cents: form.penalty_cents,
        milestone_interval_lbs: form.milestone_interval_lbs,
        milestone_payout_cents: form.milestone_payout_cents,
        milestone_bonus_interval_lbs: form.milestone_bonus_interval_lbs,
        milestone_bonus_cents: form.milestone_bonus_cents,
        timezone: form.timezone,
      })
      .select()
      .single();

    if (error) {
      Alert.alert("Error", error.message);
      setLoading(false);
      return;
    }

    // Create milestones
    const milestones = [];
    const interval = form.milestone_interval_lbs;
    const target = Number(form.target_weight_loss);
    for (let t = interval; t <= target; t += interval) {
      milestones.push({
        contract_id: contract.id,
        threshold_lbs: t,
        payout_cents: form.milestone_payout_cents,
        bonus_payout_cents: t % form.milestone_bonus_interval_lbs === 0 ? form.milestone_bonus_cents : 0,
        status: "pending",
      });
    }
    if (milestones.length > 0) {
      await supabase.from("milestones").insert(milestones);
    }

    // Create invite
    if (form.referee_email) {
      await supabase.from("contract_invites").insert({
        contract_id: contract.id,
        referee_email: form.referee_email,
      });
    }

    setLoading(false);
    router.replace(`/contract/${contract.id}`);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Contract</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {step === 1 && (
          <>
            <Text style={styles.sectionTitle}>Weight Goal</Text>
            <Text style={styles.sectionDesc}>
              Set your starting weight, target, and schedule
            </Text>

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Start Weight (lb)</Text>
                <TextInput
                  style={styles.input}
                  value={form.start_weight}
                  onChangeText={(v) => updateField("start_weight", v)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Target Loss (lb)</Text>
                <TextInput
                  style={styles.input}
                  value={form.target_weight_loss}
                  onChangeText={(v) => updateField("target_weight_loss", v)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Duration (weeks)</Text>
                <TextInput
                  style={styles.input}
                  value={form.target_duration_weeks}
                  onChangeText={(v) => updateField("target_duration_weeks", v)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Weigh-ins / week</Text>
                <TextInput
                  style={styles.input}
                  value={form.weigh_ins_per_week}
                  onChangeText={(v) => updateField("weigh_ins_per_week", v)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.label}>Referee Email</Text>
            <TextInput
              style={styles.input}
              value={form.referee_email}
              onChangeText={(v) => updateField("referee_email", v)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="referee@example.com"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Your Timezone</Text>
            <View style={styles.timezoneContainer}>
              {US_TIMEZONES.map((tz) => (
                <TouchableOpacity
                  key={tz.value}
                  style={[
                    styles.timezoneOption,
                    form.timezone === tz.value && styles.timezoneOptionSelected,
                  ]}
                  onPress={() => setForm((prev) => ({ ...prev, timezone: tz.value }))}
                >
                  <Text
                    style={[
                      styles.timezoneOptionText,
                      form.timezone === tz.value && styles.timezoneOptionTextSelected,
                    ]}
                  >
                    {tz.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                Goal: {Number(form.start_weight) - Number(form.target_weight_loss)} lb
                (from {form.start_weight} lb)
              </Text>
              <Text style={styles.summaryText}>
                {form.weigh_ins_per_week} weigh-ins/week for {form.target_duration_weeks} weeks
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setStep(2)}
            >
              <Text style={styles.primaryButtonText}>Continue to Funding</Text>
              <Ionicons name="arrow-forward" size={18} color="white" />
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>Funding</Text>
            <Text style={styles.sectionDesc}>
              {formatCents(form.total_deposit_cents)} deposit split across 4 pools
            </Text>

            {/* Pool summary */}
            {[
              { label: "Weekly Pool", cents: form.weekly_pool_cents, color: Colors.blue },
              { label: "Milestone Pool", cents: form.milestone_pool_cents, color: Colors.emerald },
              { label: "Penalty Pool", cents: form.penalty_pool_cents, color: Colors.red },
              { label: "Completion Pool", cents: form.completion_pool_cents, color: Colors.purple },
            ].map((pool) => (
              <View key={pool.label} style={styles.poolRow}>
                <View style={[styles.poolDot, { backgroundColor: pool.color }]} />
                <Text style={styles.poolLabel}>{pool.label}</Text>
                <Text style={styles.poolAmount}>{formatCents(pool.cents)}</Text>
              </View>
            ))}

            {/* Rule summary */}
            <View style={[styles.summaryBox, { marginTop: Spacing.lg }]}>
              <Text style={styles.summaryTitle}>How money moves</Text>
              <Text style={styles.summaryText}>
                Compliant week: referee earns {formatCents(form.weekly_reward_cents)}
              </Text>
              <Text style={styles.summaryText}>
                Missed week: referee earns {formatCents(form.penalty_cents)}
              </Text>
              <Text style={styles.summaryText}>
                Every {form.milestone_interval_lbs} lb: {formatCents(form.milestone_payout_cents)} payout
              </Text>
              <Text style={styles.summaryText}>
                Goal reached: {formatCents(form.completion_pool_cents)} completion bonus
              </Text>
            </View>

            {/* Warning */}
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={18} color={Colors.red} />
              <Text style={styles.warningText}>
                You&apos;re committing {formatCents(form.total_deposit_cents)}.
                Missed weigh-ins trigger penalty payouts.
              </Text>
            </View>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 1 }]}
                onPress={() => setStep(1)}
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1 }]}
                onPress={handleCreate}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? "Creating..." : "Create Contract"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.xl, paddingBottom: 40 },
  sectionTitle: { fontSize: 22, fontWeight: "700", color: Colors.text },
  sectionDesc: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.xl },
  label: { fontSize: 13, fontWeight: "500", color: Colors.textSecondary, marginBottom: 6 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.card,
    marginBottom: Spacing.lg,
  },
  row: { flexDirection: "row", gap: Spacing.md },
  half: { flex: 1 },
  summaryBox: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  summaryTitle: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 8 },
  summaryText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: Colors.redLight,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  warningText: { flex: 1, fontSize: 13, color: "#991B1B", lineHeight: 18 },
  poolRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  poolDot: { width: 10, height: 10, borderRadius: 5, marginRight: Spacing.md },
  poolLabel: { flex: 1, fontSize: 14, color: Colors.text },
  poolAmount: { fontSize: 14, fontWeight: "600", color: Colors.text },
  primaryButton: {
    flexDirection: "row",
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  primaryButtonText: { fontSize: 16, fontWeight: "600", color: Colors.primaryForeground },
  secondaryButton: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.card,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: "500", color: Colors.text },
  timezoneContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: Spacing.lg,
  },
  timezoneOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  timezoneOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  timezoneOptionText: {
    fontSize: 13,
    color: Colors.text,
  },
  timezoneOptionTextSelected: {
    color: Colors.primaryForeground,
    fontWeight: "600",
  },
});
