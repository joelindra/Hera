import { pgTable, text, varchar, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const commands = pgTable("commands", {
  id: varchar("id").primaryKey().default("gen_random_uuid()"),
  prompt: text("prompt").notNull(),
  generatedCommand: text("generated_command"),
  output: text("output"),
  exitCode: text("exit_code"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  executionMode: varchar("execution_mode", { length: 10 }).default("local"),
  timeout: text("timeout"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sshConfig = pgTable("ssh_config", {
  id: varchar("id").primaryKey().default("gen_random_uuid()"),
  host: text("host").notNull(),
  port: text("port").notNull().default("22"),
  username: text("username").notNull(),
  password: text("password"),
  privateKey: text("private_key"),
  isActive: boolean("is_active").default(false),
  lastTested: timestamp("last_tested"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommandSchema = createInsertSchema(commands).omit({
  id: true,
  createdAt: true,
});

export const insertSshConfigSchema = createInsertSchema(sshConfig).omit({
  id: true,
  createdAt: true,
  lastTested: true,
});

export type InsertCommand = z.infer<typeof insertCommandSchema>;
export type Command = typeof commands.$inferSelect;
export type SshConfig = typeof sshConfig.$inferSelect;
export type InsertSshConfig = z.infer<typeof insertSshConfigSchema>;

// Kali Client type for WebSocket connections
export interface KaliClient {
  id: string;
  name: string;
  token: string;
  filename: string;
  connected: boolean;
  lastSeen: Date;
  hostname?: string;
  os?: string;
}

// App Settings for personal API keys and integrations
export const appSettings = pgTable("app_settings", {
  id: varchar("id").primaryKey().default("singleton"),
  personalGeminiApiKey: text("personal_gemini_api_key"),
  telegramBotToken: text("telegram_bot_token"),
  telegramChatId: text("telegram_chat_id"),
  telegramEnabled: boolean("telegram_enabled").default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAppSettingsSchema = createInsertSchema(appSettings).omit({
  id: true,
  updatedAt: true,
});

export type AppSettings = typeof appSettings.$inferSelect;
export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;

export const quickTools = [
  { id: "nmap", name: "Nmap", description: "Network scanner", icon: "radar" },
  { id: "netcat", name: "Netcat", description: "Network utility", icon: "network" },
  { id: "whois", name: "Whois", description: "Domain lookup", icon: "search" },
  { id: "dig", name: "Dig", description: "DNS lookup", icon: "dns" },
  { id: "nikto", name: "Nikto", description: "Web scanner", icon: "web" },
  { id: "sqlmap", name: "SQLMap", description: "SQL injection", icon: "database" },
] as const;
