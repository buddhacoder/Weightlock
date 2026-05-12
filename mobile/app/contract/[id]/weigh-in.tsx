import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Colors, Spacing } from "@/constants/theme";

export default function WeighInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to photograph your scale.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (!user || !weight) return;
    setLoading(true);

    let photoPath = null;

    // Upload photo if taken
    if (photo) {
      const ext = photo.split(".").pop()?.toLowerCase() || "jpg";
      const contentType = ext === "png" ? "image/png" : "image/jpeg";
      const fileName = `${user.id}/${id}/${Date.now()}.${ext}`;

      const response = await fetch(photo);
      const arrayBuffer = await response.arrayBuffer();

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("weighin-photos")
        .upload(fileName, arrayBuffer, { contentType });

      if (uploadError) {
        console.warn("Photo upload failed:", uploadError.message);
      } else {
        photoPath = uploadData.path;
      }
    }

    const { error } = await supabase.from("weigh_ins").insert({
      contract_id: id,
      participant_id: user.id,
      weight_lbs: Number(weight),
      note: note || null,
      photo_path: photoPath,
      verification_status: "pending",
    });

    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.back(), 1500);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Weigh-In</Text>
        <View style={{ width: 24 }} />
      </View>

      {success ? (
        <View style={styles.successView}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={40} color={Colors.emerald} />
          </View>
          <Text style={styles.successTitle}>Submitted!</Text>
          <Text style={styles.successText}>
            Waiting for your referee to verify.
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Weight input */}
          <View style={styles.weightInputSection}>
            <TextInput
              style={styles.weightInput}
              value={weight}
              onChangeText={setWeight}
              placeholder="0.0"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              autoFocus
            />
            <Text style={styles.weightUnit}>lb</Text>
          </View>

          {/* Photo section */}
          <Text style={styles.label}>Scale Photo (optional)</Text>
          {photo ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: photo }} style={styles.photoImage} />
              <TouchableOpacity
                style={styles.removePhoto}
                onPress={() => setPhoto(null)}
              >
                <Ionicons name="close-circle" size={24} color={Colors.red} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={24} color={Colors.emerald} />
                <Text style={styles.photoButtonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={pickPhoto}>
                <Ionicons name="image-outline" size={24} color={Colors.blue} />
                <Text style={styles.photoButtonText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Note */}
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="e.g., Morning weigh-in, before breakfast"
            placeholderTextColor={Colors.textMuted}
            multiline
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, (!weight || loading) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!weight || loading}
          >
            <Ionicons name="scale-outline" size={20} color="white" />
            <Text style={styles.submitButtonText}>
              {loading ? "Submitting..." : "Submit Weigh-In"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
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
  content: { flex: 1, padding: Spacing.xl },
  weightInputSection: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginBottom: Spacing.xxxl,
    marginTop: Spacing.xl,
  },
  weightInput: {
    fontSize: 56,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
    minWidth: 160,
  },
  weightUnit: {
    fontSize: 24,
    fontWeight: "500",
    color: Colors.textMuted,
    marginLeft: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  photoActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 56,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Colors.border,
    borderRadius: 14,
    backgroundColor: Colors.card,
  },
  photoButtonText: { fontSize: 14, fontWeight: "500", color: Colors.text },
  photoPreview: {
    height: 160,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: Spacing.xl,
    position: "relative",
  },
  photoImage: { width: "100%", height: "100%" },
  removePhoto: { position: "absolute", top: 8, right: 8 },
  noteInput: {
    height: 80,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.card,
    marginBottom: Spacing.xxl,
    textAlignVertical: "top",
  },
  submitButton: {
    flexDirection: "row",
    height: 52,
    backgroundColor: Colors.emerald,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  buttonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 16, fontWeight: "600", color: "white" },
  successView: { flex: 1, justifyContent: "center", alignItems: "center" },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.emeraldLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  successTitle: { fontSize: 22, fontWeight: "700", color: Colors.text },
  successText: { fontSize: 15, color: Colors.textSecondary, marginTop: 4 },
});
