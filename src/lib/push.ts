import { createServiceClient } from "@/lib/supabase/server";

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Send an Expo push notification to a user.
 * Fire-and-forget — logs errors but never throws.
 */
export async function sendPushNotification(
  userId: string,
  message: PushMessage
): Promise<void> {
  try {
    const supabase = await createServiceClient();

    const { data: tokens, error } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", userId);

    if (error || !tokens || tokens.length === 0) {
      return;
    }

    const messages = tokens.map((t: { token: string }) => ({
      to: t.token,
      sound: "default" as const,
      title: message.title,
      body: message.body,
      data: message.data ?? {},
    }));

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error("Failed to send push notification:", err);
  }
}
