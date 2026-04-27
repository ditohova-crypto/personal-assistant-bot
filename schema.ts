import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  boolean,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const telegramUsers = mysqlTable("telegram_users", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull().references(() => users.id),
  telegramId: bigint("telegram_id", { mode: "number", unsigned: true }).notNull().unique(),
  telegramUsername: varchar("telegram_username", { length: 255 }),
  botToken: varchar("bot_token", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type TelegramUser = typeof telegramUsers.$inferSelect;

export const reminderSettings = mysqlTable("reminder_settings", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull().references(() => users.id),
  morningTime: varchar("morning_time", { length: 5 }).default("08:00").notNull(),
  afternoonTime: varchar("afternoon_time", { length: 5 }).default("13:00").notNull(),
  eveningTime: varchar("evening_time", { length: 5 }).default("20:00").notNull(),
  morningEnabled: boolean("morning_enabled").default(true).notNull(),
  afternoonEnabled: boolean("afternoon_enabled").default(true).notNull(),
  eveningEnabled: boolean("evening_enabled").default(true).notNull(),
  timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type ReminderSettings = typeof reminderSettings.$inferSelect;

export const tasks = mysqlTable("tasks", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull().references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

export const chatMessages = mysqlTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull().references(() => users.id),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;

export const reminders = mysqlTable("reminders", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull().references(() => users.id),
  type: mysqlEnum("type", ["morning", "afternoon", "evening"]).notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  tasksSummary: text("tasks_summary"),
});

export type Reminder = typeof reminders.$inferSelect;