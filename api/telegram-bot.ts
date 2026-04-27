import TelegramBot from "node-telegram-bot-api";
import { eq } from "drizzle-orm";
import { getDb } from "./queries/connection";
import { telegramUsers, tasks, chatMessages, reminderSettings, reminders } from "../db/schema";
import OpenAI from "openai";

const kimi = new OpenAI({
  apiKey: process.env.KIMI_API_KEY || "",
  baseURL: process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1",
});

const SYSTEM_PROMPT = `Ты — личный ассистент пользователя в Telegram. Твои задачи:
1. Помогать управлять задачами — создавать, напоминать, отмечать выполнение
2. Вести дружелюбный диалог на русском языке
3. Утром, днём и вечером присылать сводку задач
4. Поддерживать мотивацию и помогать с продуктивностью
5. Отвечать кратко и по делу, но тепло

Команды бота:
/tasks — показать активные задачи
/done <номер> — отметить задачу выполненной
/new <текст> — добавить новую задачу
/clear — очистить историю чата
/settings — настройки напоминаний

При получении задач от пользователя, предлагай помочь с приоритизацией.
Когда пользователь просит показать задачи — выводи их списком с номерами.`;

export class TelegramBotService {
  private bot: TelegramBot | null = null;
  private polling = false;

  async start() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.log("[Telegram] No bot token configured, skipping bot startup");
      return;
    }

    try {
      this.bot = new TelegramBot(token, { polling: false });
      
      // Test connection
      const me = await this.bot.getMe();
      console.log(`[Telegram] Bot connected: @${me.username}`);

      // Setup polling
      this.bot = new TelegramBot(token, { polling: true });
      this.polling = true;

      this.setupHandlers();
      console.log("[Telegram] Bot polling started");
    } catch (error) {
      console.error("[Telegram] Failed to start bot:", error);
    }
  }

  private setupHandlers() {
    if (!this.bot) return;

    // Handle text messages
    this.bot.on("message", async (msg) => {
      if (!msg.text || msg.from?.is_bot) return;

      const chatId = msg.chat.id;
      const text = msg.text;
      const username = msg.from?.username;

      // Handle commands
      if (text.startsWith("/")) {
        await this.handleCommand(chatId, text, username);
        return;
      }

      // Handle natural language
      await this.handleNaturalLanguage(chatId, text, username);
    });
  }

  private async handleCommand(chatId: number, text: string, username?: string) {
    if (!this.bot) return;

    const parts = text.split(" ");
    const command = parts[0];
    const args = parts.slice(1).join(" ");

    const db = getDb();

    // Find user by telegram ID
    const [tgUser] = await db
      .select()
      .from(telegramUsers)
      .where(eq(telegramUsers.telegramId, chatId));

    if (!tgUser) {
      // Auto-register first interaction
      await this.bot.sendMessage(chatId, 
        "Привет! Я твой личный ассистент. Я помогу тебе управлять задачами и буду напоминать о них утром, днём и вечером.\n\n" +
        "Доступные команды:\n" +
        "/tasks — показать задачи\n" +
        "/new <текст> — добавить задачу\n" +
        "/done <номер> — отметить выполненной\n" +
        "/clear — очистить историю\n" +
        "/settings — настройки\n\n" +
        "Или просто напиши мне что угодно!"
      );
      return;
    }

    const userId = tgUser.userId;

    switch (command) {
      case "/start":
        await this.bot.sendMessage(chatId, 
          `Привет, ${username || "друг"}! 👋\n\nЯ твой личный ассистент. Вот что я умею:\n\n` +
          `✅ Вести список задач\n` +
          `⏰ Напоминать утром, днём и вечером\n` +
          `💬 Общаться и помогать с планированием\n\n` +
          `Просто напиши мне задачу, или используй команды.`
        );
        break;

      case "/tasks":
      case "/задачи":
        const userTasks = await db
          .select()
          .from(tasks)
          .where(eq(tasks.userId, userId))
          .orderBy(tasks.createdAt);

        const activeTasks = userTasks.filter(t => t.status !== "completed" && t.status !== "cancelled");
        
        if (activeTasks.length === 0) {
          await this.bot.sendMessage(chatId, "🎉 У тебя нет активных задач! Отличная работа.");
        } else {
          let msg = `📋 Твои задачи (${activeTasks.length}):\n\n`;
          activeTasks.forEach((task, i) => {
            const status = task.status === "in_progress" ? "🟡" : "⚪";
            const priority = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟠" : "🟢";
            msg += `${i + 1}. ${status} ${priority} ${task.title}\n`;
          });
          msg += "\nДля отметки выполненной: /done <номер>";
          await this.bot.sendMessage(chatId, msg);
        }
        break;

      case "/new":
      case "/add":
        if (!args.trim()) {
          await this.bot.sendMessage(chatId, "❌ Напиши задачу после команды. Пример: /new Купить молоко");
          return;
        }
        await db.insert(tasks).values({
          userId,
          title: args.trim(),
          status: "pending",
          priority: "medium",
        });
        await this.bot.sendMessage(chatId, `✅ Задача добавлена: "${args.trim()}"`);
        break;

      case "/done":
      case "/complete":
        if (!args.trim()) {
          await this.bot.sendMessage(chatId, "❌ Укажи номер задачи. Пример: /done 1");
          return;
        }
        const taskNum = parseInt(args.trim());
        if (isNaN(taskNum)) {
          await this.bot.sendMessage(chatId, "❌ Нужно указать число. Пример: /done 1");
          return;
        }
        const allTasks = await db
          .select()
          .from(tasks)
          .where(eq(tasks.userId, userId))
          .orderBy(tasks.createdAt);
        const pendingTasks = allTasks.filter(t => t.status !== "completed" && t.status !== "cancelled");
        if (taskNum < 1 || taskNum > pendingTasks.length) {
          await this.bot.sendMessage(chatId, `❌ Неверный номер. Всего активных задач: ${pendingTasks.length}`);
          return;
        }
        const taskToComplete = pendingTasks[taskNum - 1];
        await db.update(tasks).set({ status: "completed", completedAt: new Date() }).where(eq(tasks.id, taskToComplete.id));
        await this.bot.sendMessage(chatId, `🎉 Задача выполнена: "${taskToComplete.title}"`);
        break;

      case "/clear":
        await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
        await this.bot.sendMessage(chatId, "🧹 История чата очищена!");
        break;

      case "/settings":
        const [settings] = await db.select().from(reminderSettings).where(eq(reminderSettings.userId, userId));
        if (settings) {
          await this.bot.sendMessage(chatId, 
            `⚙️ Настройки напоминаний:\n\n` +
            `Утро: ${settings.morningEnabled ? "✅" : "❌"} ${settings.morningTime}\n` +
            `День: ${settings.afternoonEnabled ? "✅" : "❌"} ${settings.afternoonTime}\n` +
            `Вечер: ${settings.eveningEnabled ? "✅" : "❌"} ${settings.eveningTime}\n` +
            `Часовой пояс: ${settings.timezone}`
          );
        } else {
          await this.bot.sendMessage(chatId, "Настройки по умолчанию:\nУтро: 08:00 ✅\nДень: 13:00 ✅\nВечер: 20:00 ✅");
        }
        break;

      case "/help":
        await this.bot.sendMessage(chatId, 
          `🤖 Команды:\n\n` +
          `/tasks — список задач\n` +
          `/new <текст> — новая задача\n` +
          `/done <номер> — выполнить задачу\n` +
          `/clear — очистить чат\n` +
          `/settings — настройки\n` +
          `/help — помощь`
        );
        break;

      default:
        await this.bot.sendMessage(chatId, "Неизвестная команда. Напиши /help для списка команд.");
    }
  }

  private async handleNaturalLanguage(chatId: number, text: string, username?: string) {
    if (!this.bot) return;

    const db = getDb();
    const [tgUser] = await db.select().from(telegramUsers).where(eq(telegramUsers.telegramId, chatId));

    // If not registered, we can't store anything but can still chat
    let userId: number | null = null;
    if (tgUser) {
      userId = tgUser.userId;
    }

    // Save user message if we have a user
    if (userId) {
      await db.insert(chatMessages).values({
        userId,
        role: "user",
        content: text,
      });
    }

    // Get recent history
    let history: { role: string; content: string }[] = [];
    if (userId) {
      history = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.userId, userId))
        .orderBy(chatMessages.createdAt)
        .limit(20);
    }

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      { role: "user" as const, content: text },
    ];

    try {
      const completion = await kimi.chat.completions.create({
        model: "kimi-latest",
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const assistantContent = completion.choices[0]?.message?.content || "Извини, не удалось обработать запрос.";

      // Save assistant response
      if (userId) {
        await db.insert(chatMessages).values({
          userId,
          role: "assistant",
          content: assistantContent,
        });
      }

      await this.bot.sendMessage(chatId, assistantContent);
    } catch (error) {
      console.error("[Telegram] Kimi API error:", error);
      await this.bot.sendMessage(chatId, "Извини, произошла ошибка. Попробуй позже.");
    }
  }

  // Send reminder to user
  async sendReminder(chatId: number, type: "morning" | "afternoon" | "evening", userId: number) {
    if (!this.bot) return;

    const db = getDb();
    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(tasks.createdAt);

    const pendingTasks = userTasks.filter(t => t.status !== "completed" && t.status !== "cancelled");
    const completedToday = userTasks.filter(t => 
      t.status === "completed" && 
      t.completedAt && 
      new Date(t.completedAt).toDateString() === new Date().toDateString()
    );

    let greeting = "";
    let emoji = "";
    switch (type) {
      case "morning":
        greeting = "Доброе утро";
        emoji = "🌅";
        break;
      case "afternoon":
        greeting = "Добрый день";
        emoji = "☀️";
        break;
      case "evening":
        greeting = "Добрый вечер";
        emoji = "🌙";
        break;
    }

    let msg = `${emoji} ${greeting}!\n\n`;

    if (pendingTasks.length === 0) {
      msg += "🎉 У тебя нет активных задач! Отличная работа.";
    } else {
      msg += `📋 Активные задачи (${pendingTasks.length}):\n\n`;
      pendingTasks.forEach((task, i) => {
        const priority = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟠" : "🟢";
        msg += `${i + 1}. ${priority} ${task.title}\n`;
      });
    }

    if (completedToday.length > 0) {
      msg += `\n✅ Сегодня выполнено: ${completedToday.length}`;
    }

    msg += "\n\n💡 Напиши /tasks для полного списка или просто отправь мне новую задачу!";

    await this.bot.sendMessage(chatId, msg);

    // Record reminder sent
    await db.insert(reminders).values({
      userId,
      type,
      tasksSummary: pendingTasks.map(t => t.title).join(", "),
    });
  }

  async stop() {
    if (this.bot && this.polling) {
      this.bot.stopPolling();
      this.polling = false;
      console.log("[Telegram] Bot polling stopped");
    }
  }
}

export const telegramBotService = new TelegramBotService();
