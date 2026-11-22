import { LocalNotifications } from "@capacitor/local-notifications";
import { REMINDER_LABELS, REMINDER_MESSAGES } from "../data";
import type { Reminder, ReminderType } from "../types";
import { isNative } from "./platform";

/*
 * In the native app reminders are scheduled with the phone, so they arrive
 * when the app is closed. They repeat daily, or weekly for weigh-in and the
 * weekly review. The phone can't check whether today's task is already done,
 * so these fire regardless.
 */

const IDS: Record<ReminderType, number> = { workout: 101, food: 102, steps: 103, water: 104, "weigh-in": 105, "weekly-review": 106 };

export async function notificationPermission(): Promise<"granted" | "denied" | "prompt"> {
  if (!isNative) return "prompt";
  const { display } = await LocalNotifications.checkPermissions();
  return display === "granted" ? "granted" : display === "denied" ? "denied" : "prompt";
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative) return false;
  const { display } = await LocalNotifications.requestPermissions();
  return display === "granted";
}

export async function scheduleReminders(reminders: Reminder[], bodyFor: (r: Reminder) => string = (r) => REMINDER_MESSAGES[r.type]): Promise<void> {
  if (!isNative) return;
  await LocalNotifications.cancel({ notifications: Object.values(IDS).map((id) => ({ id })) }).catch(() => {});
  const enabled = reminders.filter((r) => r.enabled);
  if (!enabled.length) return;
  if ((await notificationPermission()) !== "granted") return;
  await LocalNotifications.schedule({
    notifications: enabled.map((r) => {
      const [hour, minute] = r.time.split(":").map(Number);
      return {
        id: IDS[r.type],
        title: REMINDER_LABELS[r.type],
        body: bodyFor(r),
        // Capacitor's Weekday runs 1 (Sunday) to 7. The app stores 0 (Sunday) to 6.
        schedule: { on: r.weekday !== undefined ? { weekday: r.weekday + 1, hour, minute } : { hour, minute }, repeats: true, allowWhileIdle: true },
      };
    }),
  });
}
