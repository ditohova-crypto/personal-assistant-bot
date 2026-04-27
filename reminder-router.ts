import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { reminderSettings, tasks } from "../db/schema";

export const reminderRouter = createRouter({
  getSettings: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [settings] = await db
      .select()
      .from(reminderSettings)
      .where(eq(reminderSettings.userId, ctx.user.id));
    return settings || null;
  }),

  updateSettings: authedQuery
    .input(
      z.object({
        morningTime: z.string().regex(/^([0-1]?\d|2[0-3]):[0-5]\d$/).optional(),
        afternoonTime: z.string().regex(/^([0-1]?\d|2[0-3]):[0-5]\d$/).optional(),
        eveningTime: z.string().regex(/^([0-1]?\d|2[0-3]):[0-5]\d$/).optional(),
        morningEnabled: z.boolean().optional(),
        afternoonEnabled: z.boolean().optional(),
        eveningEnabled: z.boolean().optional(),
        timezone: z.string().max(50).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [existing] = await db
        .select()
        .from(reminderSettings)
        .where(eq(reminderSettings.userId, ctx.user.id));

      if (existing) {
        await db
          .update(reminderSettings)
          .set(input)
          .where(eq(reminderSettings.id, existing.id));
        const [updated] = await db
          .select()
          .from(reminderSettings)
          .where(eq(reminderSettings.id, existing.id));
        return updated;
      } else {
        const [created] = await db
          .insert(reminderSettings)
          .values({
            userId: ctx.user.id,
            ...input,
          });
        return created;
      }
    }),

  getTasksForReminder: authedQuery
    .input(z.object({ type: z.enum(["morning", "afternoon", "evening"]) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const userTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, ctx.user.id),
            eq(tasks.status, "pending")
          )
        );
      return {
        type: input.type,
        count: userTasks.length,
        tasks: userTasks,
      };
    }),
});
