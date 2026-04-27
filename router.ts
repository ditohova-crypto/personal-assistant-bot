import { eq } from "drizzle-orm";
import nodeCron from "node-cron";
import { getDb } from "./queries/connection";
import { reminderSettings, telegramUsers } from "../db/schema";
import { telegramBotService } from "./telegram-bot";

let cronJob: nodeCron.ScheduledTask | null = null;

export function startReminderCron() {
  if (cronJob) {
    console.log("[Cron] Already running");
    return;
  }

  // Run every minute to check reminders
  cronJob = nodeCron.schedule("* * * * *", async () => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const db = getDb();
    const allSettings = await db.select().from(reminderSettings);

    for (const settings of allSettings) {
      // Skip if this time slot is disabled
      let shouldSend = false;
      let type: "morning" | "afternoon" | "evening" | null = null;

      if (settings.morningEnabled && settings.morningTime === currentTime) {
        shouldSend = true;
        type = "morning";
      } else if (settings.afternoonEnabled && settings.afternoonTime === currentTime) {
        shouldSend = true;
        type = "afternoon";
      } else if (settings.eveningEnabled && settings.eveningTime === currentTime) {
        shouldSend = true;
        type = "evening";
      }

      if (!shouldSend || !type) continue;

      // Find telegram user
      const [tgUser] = await db
        .select()
        .from(telegramUsers)
        .where(eq(telegramUsers.userId, settings.userId));

      if (!tgUser) continue;

      try {
        await telegramBotService.sendReminder(tgUser.telegramId, type, settings.userId);
        console.log(`[Cron] Sent ${type} reminder to user ${settings.userId}`);
      } catch (error) {
        console.error(`[Cron] Failed to send reminder to user ${settings.userId}:`, error);
      }
    }
  });

  console.log("[Cron] Reminder cron started (checks every minute)");
}

export function stopReminderCron() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log("[Cron] Reminder cron stopped");
  }
}
