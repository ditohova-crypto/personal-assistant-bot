import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { tasks } from "../db/schema";

export const taskRouter = createRouter({
  list: authedQuery
    .input(z.object({ status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(tasks.userId, ctx.user.id)];
      if (input?.status) {
        conditions.push(eq(tasks.status, input.status));
      }
      return db
        .select()
        .from(tasks)
        .where(and(...conditions))
        .orderBy(desc(tasks.createdAt));
    }),

  create: authedQuery
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
        dueDate: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [task] = await db.insert(tasks).values({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      });
      return task;
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        dueDate: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status !== undefined) {
        updateData.status = data.status;
        if (data.status === "completed") {
          updateData.completedAt = new Date();
        }
      }
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);

      await db.update(tasks)
        .set(updateData)
        .where(and(eq(tasks.id, id), eq(tasks.userId, ctx.user.id)));

      const [updated] = await db.select().from(tasks).where(eq(tasks.id, id));
      return updated;
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(tasks)
        .where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.user.id)));
      return { success: true };
    }),
});
