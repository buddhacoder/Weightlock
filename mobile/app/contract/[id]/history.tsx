import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { formatCents } from "@/lib/utils";
import { Colors, Spacing } from "@/constants/theme";

interface TimelineEvent {
  id: string;
  type: "weighin" | "evaluation" | "milestone" | "ledger";
  timestamp: string;
  data: any;
}

export default function HistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    async function load() {
      const [{ data: wi }, { data: ev }, { data: ms }, { data: le }] = await Promise.all([
        supabase.from("weigh_ins").select("*").eq("contract_id", id).order("submitted_at", { ascending: false }),
        supabase.from("weekly_evaluations").select("*").eq("contract_id", id).order("processed_at", { ascending: false }),
        supabase.from("milestones").select("*").eq("contract_id", id).neq("status", "pending").order("triggered_at", { ascending: false }),
        supabase.from("ledger_entries").select("*").eq("contract_id", id).order("created_at", { ascending: false }),
      ]);

      const all: TimelineEvent[] = [
        ...(wi || []).map((w: any) => ({ id: `wi-${w.id}`, type: "weighin" as const, timestamp: w.submitted_at, data: w })),
        ...(ev || []).map((e: any) => ({ id: `ev-${e.id}`, type: "evaluation" as const, timestamp: e.processed_at, data: e })),
        ...(ms || []).map((m: any) => ({ id: `ms-${m.id}`, type: "milestone" as const, timestamp: m.triggered_at, data: m })),
        ...(le || []).map((l: any) => ({ id: `le-${l.id}`, type: "ledger" as const, timestamp: l.created_at, data: l })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setEvents(all);
    }
    load();
  }, [id]);

  function getIcon(type: string) {
    switch (type) {
      case "weighin": return { name: "scale-outline" as const, color: Colors.blue };
      case "evaluation": return { name: "calendar-outline" as const, color: Colors.purple };
      case "milestone": return { name: "flag-outline" as const, color: Colors.emerald };
      case "ledger": return { name: "wallet-outline" as const, color: Colors.amber };
      default: return { name: "ellipse-outline" as const, color: Colors.textMuted };
    }
  }

  function getDescription(event: TimelineEvent): { title: string; subtitle: string } {
    switch (event.type) {
      case "weighin":
        return {
          title: `Weigh-in: ${event.data.weight_lbs} lb`,
          subtitle: event.data.verification_status,
        };
      case "evaluation":
        return {
          title: `Week ${event.data.week_number} — ${event.data.outcome}`,
          subtitle: `${event.data.completed_verified_count}/${event.data.required_count} weigh-ins · ${formatCents(event.data.payout_cents)}`,
        };
      case "milestone":
        return {
          title: `${event.data.threshold_lbs} lb milestone reached`,
          subtitle: formatCents(event.data.payout_cents + event.data.bonus_payout_cents),
        };
      case "ledger":
        return {
          title: event.data.entry_type.replace(/_/g, " "),
          subtitle: `${event.data.direction === "credit" ? "+" : "-"}${formatCents(event.data.amount_cents)}`,
        };
      default:
        return { title: "", subtitle: "" };
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {events.length === 0 && (
          <Text style={styles.emptyText}>No activity yet</Text>
        )}
        {events.map((event) => {
          const icon = getIcon(event.type);
          const desc = getDescription(event);
          return (
            <View key={event.id} style={styles.eventRow}>
              <View style={[styles.eventIcon, { backgroundColor: icon.color + "20" }]}>
                <Ionicons name={icon.name} size={16} color={icon.color} />
              </View>
              <View style={styles.eventContent}>
                <Text style={styles.eventTitle}>{desc.title}</Text>
                <Text style={styles.eventSub}>{desc.subtitle}</Text>
              </View>
              <Text style={styles.eventDate}>
                {new Date(event.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </Text>
            </View>
          );
        })}
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
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: "center", paddingVertical: 60 },
  eventRow: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  eventIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  eventContent: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: "500", color: Colors.text, textTransform: "capitalize" },
  eventSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, textTransform: "capitalize" },
  eventDate: { fontSize: 12, color: Colors.textMuted },
});
