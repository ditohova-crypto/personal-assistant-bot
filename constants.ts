import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { chatMessages } from "../db/schema";
import OpenAI from "openai";

const kimi = new OpenAI({
  apiKey: process.env.KIMI_API_KEY || "",
  baseURL: process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1",
});

const SYSTEM_PROMPT = `Ты — личный ассистент пользователя. Твои задачи:
1. Помогать управлять задачами — создавать, напоминать, отмечать выполнение
2. Вести дружелюбный диалог на русском языке
3. Утром, днём и вечером присылать сводку задач
4. Поддерживать мотивацию и помогать с продуктивностью
5. Отвечать кратко и по делу, но тепло

При получении задач от пользователя, предлагай помочь с приоритизацией.
Когда пользователь просит показать задачи — выводи их списком с номерами.
Для отметки задачи выполненной проси номер задачи.`;

export const chatRouter = createRouter({
  getHistory: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, ctx.user.id))
      .orderBy(desc(chatMessages.createdAt))
      .limit(100);
  }),

  sendMessage: authedQuery
    .input(z.object({ content: z.string().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      
      // Save user message
      await db.insert(chatMessages).values({
        userId: ctx.user.id,
        role: "user",
        content: input.content,
      });

      // Get recent history for context
      const history = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.userId, ctx.user.id))
        .orderBy(desc(chatMessages.createdAt))
        .limit(20);

      const messages = [
        { role: "system" as const, content: SYSTEM_PROMPT },
        ...history.reverse().map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
        { role: "user" as const, content: input.content },
      ];

      // Call Kimi API (OpenAI-compatible endpoint)
      const completion = await kimi.chat.completions.create({
        model: "kimi-latest",
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const assistantContent = completion.choices[0]?.message?.content || "Извини, не удалось обработать запрос.";

      // Save assistant response
      await db.insert(chatMessages).values({
        userId: ctx.user.id,
        role: "assistant",
        content: assistantContent,
      });

      return { role: "assistant", content: assistantContent };
    }),

  clearHistory: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    await db.delete(chatMessages).where(eq(chatMessages.userId, ctx.user.id));
    return { success: true };
  }),
});
