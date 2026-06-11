import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { Colors, Spacing } from "@/constants/theme";

export default function LoginScreen() {
  const { signIn, verifyCode } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode() {
    if (!email) return;
    setLoading(true);
    setError(null);
    const result = await signIn(email);
    if (result.error) {
      setError(result.error);
    } else {
      setStep("code");
    }
    setLoading(false);
  }

  async function handleVerify() {
    if (!code) return;
    setLoading(true);
    setError(null);
    const result = await verifyCode(email, code);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.replace("/dashboard");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="scale-outline" size={32} color={Colors.emerald} />
          </View>
          <Text style={styles.appName}>WeightLock</Text>
          <Text style={styles.tagline}>Put money behind your goals</Text>
        </View>

        <View style={styles.formSection}>
          {step === "email" ? (
            <>
              <Text style={styles.formTitle}>Sign in</Text>
              <Text style={styles.formSubtitle}>
                Enter your email to receive a sign-in code
              </Text>

              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendCode}
                disabled={loading || !email}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Sending..." : "Send Code"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.formTitle}>Enter code</Text>
              <Text style={styles.formSubtitle}>
                We sent a 6-digit code to{"\n"}
                <Text style={{ fontWeight: "600" }}>{email}</Text>
              </Text>

              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="000000"
                placeholderTextColor={Colors.textMuted}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                editable={!loading}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity
                style={[styles.button, (loading || code.length < 6) && styles.buttonDisabled]}
                onPress={handleVerify}
                disabled={loading || code.length < 6}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Verifying..." : "Verify"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                }}
                style={styles.linkButton}
              >
                <Text style={styles.linkButtonText}>Use a different email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.emeraldLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
  },
  tagline: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  formSection: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.xxl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "center",
  },
  formSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: Spacing.xl,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
    marginBottom: Spacing.lg,
  },
  codeInput: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 8,
  },
  error: {
    fontSize: 13,
    color: Colors.red,
    marginBottom: Spacing.md,
  },
  button: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primaryForeground,
  },
  linkButton: {
    marginTop: Spacing.lg,
    alignItems: "center",
  },
  linkButtonText: {
    fontSize: 14,
    color: Colors.emerald,
    fontWeight: "500",
  },
});
