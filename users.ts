import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { telegramUsers } from "../db/schema";

export const telegramRouter = createRouter({
  getSettings: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [settings] = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.userId, ctx.user.id));
    return settings || null;
  }),

  saveSettings: authedQuery
    .input(
      z.object({
        telegramId: z.number().positive(),
        telegramUsername: z.string().optional(),
        botToken: z.string().regex(/^\d+:[A-Za-z0-9_-]+$/).min(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [existing] = await db
        .select()
        .from(telegramUsers)
        .where(eq(telegramUsers.userId, ctx.user.id));

      if (existing) {
        await db
          .update(telegramUsers)
          .set({
            telegramId: input.telegramId,
            telegramUsername: input.telegramUsername,
            botToken: input.botToken,
          })
          .where(eq(telegramUsers.id, existing.id));
        const [updated] = await db
          .select()
          .from(telegramUsers)
          .where(eq(telegramUsers.id, existing.id));
        return updated;
      } else {
        const [created] = await db
          .insert(telegramUsers)
          .values({
            userId: ctx.user.id,
            telegramId: input.telegramId,
            telegramUsername: input.telegramUsername,
            botToken: input.botToken,
          });
        return created;
      }
    }),

  deleteSettings: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    await db
      .delete(telegramUsers)
      .where(eq(telegramUsers.userId, ctx.user.id));
    return { success: true };
  }),
});
