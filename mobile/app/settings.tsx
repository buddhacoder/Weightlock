import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Colors, Spacing } from "@/constants/theme";

const APP_URL = process.env.EXPO_PUBLIC_APP_URL || "https://weightlock.app";

export default function SettingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<{ full_name: string | null }>({
    full_name: null,
  });
  const [stripeStatus, setStripeStatus] = useState<{
    hasAccount: boolean;
    onboardingComplete: boolean;
  }>({ hasAccount: false, onboardingComplete: false });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    const [{ data: profileData }, { data: stripeData }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      supabase
        .from("stripe_accounts")
        .select("stripe_connect_account_id, onboarding_complete")
        .eq("user_id", user.id)
        .single(),
    ]);

    if (profileData) setProfile(profileData);
    setStripeStatus({
      hasAccount: !!stripeData?.stripe_connect_account_id,
      onboardingComplete: stripeData?.onboarding_complete ?? false,
    });
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const openPayoutSetup = () => {
    Linking.openURL(`${APP_URL}/api/stripe/connect-onboarding`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-outline" size={20} color={Colors.emerald} />
            </View>
            <Text style={styles.cardTitle}>Profile</Text>
          </View>
          <Text style={styles.profileName}>
            {profile.full_name || "Not set"}
          </Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>

        {/* Payouts card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="wallet-outline"
                size={20}
                color={Colors.emerald}
              />
            </View>
            <Text style={styles.cardTitle}>Payouts</Text>
            {stripeStatus.onboardingComplete && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>

          {stripeStatus.onboardingComplete ? (
            <Text style={styles.cardDescription}>
              Your Stripe Connect account is set up. Referee earnings are
              transferred automatically.
            </Text>
          ) : (
            <>
              <Text style={styles.cardDescription}>
                Set up a Stripe Connect account to receive referee payouts.
                Stripe onboarding requires a web browser.
              </Text>
              <TouchableOpacity
                style={styles.setupButton}
                onPress={openPayoutSetup}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="open-outline"
                  size={16}
                  color={Colors.primaryForeground}
                />
                <Text style={styles.setupButtonText}>
                  Set up payouts on web
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
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
  backButton: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.xl, paddingBottom: 40 },
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
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.emeraldLight,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  activeBadge: {
    backgroundColor: Colors.emeraldLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.emeraldDark,
  },
  setupButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    borderRadius: 10,
    marginTop: Spacing.lg,
  },
  setupButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primaryForeground,
  },
});
