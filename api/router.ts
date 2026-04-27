import { authRouter } from "./auth-router";
import { taskRouter } from "./task-router";
import { reminderRouter } from "./reminder-router";
import { telegramRouter } from "./telegram-router";
import { chatRouter } from "./chat-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  task: taskRouter,
  reminder: reminderRouter,
  telegram: telegramRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;
