import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export async function savePushToken(userId: string, token: string) {
  // Store the push token in the user's profile metadata
  // In production, you'd have a dedicated push_tokens table
  await supabase
    .from("profiles")
    .update({
      // Store in metadata or a dedicated column
      // For MVP, we log it — a proper push_tokens table should be added
    })
    .eq("id", userId);

  console.log("Push token for user", userId, ":", token);
}

export async function scheduleWeighInReminder() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time to weigh in!",
      body: "Don't miss your weigh-in — consistency keeps your funds safe.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 7,
      minute: 0,
    },
  });
}
