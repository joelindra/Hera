import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";
import type { Command } from "@shared/schema";

// Manage multiple bots and authorized chat IDs
let bots = new Map<string, TelegramBot>(); // token -> bot
let allowedChatIds = new Set<string>();
let chatIdToToken = new Map<string, string>(); // remember which bot a chat spoke to
let isInitialized = false;

function parseCsv(input: string): string[] {
  return input
    .split(/[\,\r\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function initializeTelegramBot(tokensCsv: string, chatIdsCsv: string): Promise<void> {
  try {
    // Stop existing bots if any
    for (const botInstance of Array.from(bots.values())) {
      await botInstance.stopPolling();
    }
    bots.clear();
    chatIdToToken.clear();

    const tokens = parseCsv(tokensCsv);
    const chatIds = parseCsv(chatIdsCsv);
    allowedChatIds = new Set(chatIds);

    if (tokens.length === 0) {
      isInitialized = false;
      console.log("No Telegram tokens provided");
      return;
    }

    // Create bot instance per token
    for (const token of tokens) {
      const bot = new TelegramBot(token, { polling: true });
      bots.set(token, bot);

      // Common handlers bound to each bot
      bot.onText(/\/start/, async (msg) => {
        const userChatId = msg.chat.id.toString();
        // Remember mapping for replies
        chatIdToToken.set(userChatId, token);

        if (!allowedChatIds.has(userChatId)) {
          await bot.sendMessage(userChatId, "⛔ Unauthorized. This bot is not enabled for your chat ID.");
          return;
        }

        await bot.sendMessage(
          userChatId,
          `🤖 *HERA — Incredible Pentest Agent*\n\n` +
            `Welcome! This bot allows you to execute Kali Linux commands using natural language.\n\n` +
            `Use /help to see available commands.`,
          { parse_mode: "Markdown" }
        );
      });

      bot.onText(/\/help/, async (msg) => {
        const userChatId = msg.chat.id.toString();
        chatIdToToken.set(userChatId, token);
        if (!allowedChatIds.has(userChatId)) {
          await bot.sendMessage(userChatId, "⛔ Unauthorized. This bot is not enabled for your chat ID.");
          return;
        }

        await bot.sendMessage(
          userChatId,
          `📖 *Available Commands*\n\n` +
            `/start - Start the bot\n` +
            `/help - Show this help message\n` +
            `/ping - Test bot connection\n` +
            `/status - Check bot and Kali connection status\n` +
            `/history - View recent command history\n\n` +
            `*Execute Commands:*\n` +
            `Simply send a message with your command prompt in natural language.\n\n` +
            `Example:\n` +
            `\`Scan ports 80 and 443 on 192.168.1.1 using nmap\`\n` +
            `\`Check whois information for google.com\`\n` +
            `\`Perform DNS lookup for github.com\``,
          { parse_mode: "Markdown" }
        );
      });

      bot.onText(/\/ping/, async (msg) => {
        const userChatId = msg.chat.id.toString();
        chatIdToToken.set(userChatId, token);
        if (!allowedChatIds.has(userChatId)) {
          await bot.sendMessage(userChatId, "⛔ Unauthorized. This bot is not enabled for your chat ID.");
          return;
        }
        await bot.sendMessage(userChatId, "🏓 Pong! Bot is active and ready.");
      });

      bot.onText(/\/status/, async (msg) => {
        const userChatId = msg.chat.id.toString();
        chatIdToToken.set(userChatId, token);
        if (!allowedChatIds.has(userChatId)) {
          await bot.sendMessage(userChatId, "⛔ Unauthorized. This bot is not enabled for your chat ID.");
          return;
        }
        const kaliClients = await storage.getKaliClients();
        const connectedClients = kaliClients.filter((c) => c.connected);
        const status =
          `📊 *Bot Status*\n\n` +
          `🤖 Bot: Active ✅\n` +
          `🖥️ Kali Clients: ${connectedClients.length} connected / ${kaliClients.length} total\n\n` +
          (connectedClients.length > 0
            ? `*Connected Clients:*\n` + connectedClients.map((c) => `• ${c.name} (${c.hostname || "Unknown"})`).join("\n")
            : `No Kali clients connected`);
        await bot.sendMessage(userChatId, status, { parse_mode: "Markdown" });
      });

      bot.onText(/\/history/, async (msg) => {
        const userChatId = msg.chat.id.toString();
        chatIdToToken.set(userChatId, token);
        if (!allowedChatIds.has(userChatId)) {
          await bot.sendMessage(userChatId, "⛔ Unauthorized. This bot is not enabled for your chat ID.");
          return;
        }
        const commands = await storage.getCommands();
        const recentCommands = commands.slice(0, 5);
        if (recentCommands.length === 0) {
          await bot.sendMessage(userChatId, "📋 No command history available.");
          return;
        }
        const historyText = recentCommands
          .map((cmd, index) => {
            const status = cmd.status === "completed" && cmd.exitCode === "0" ? "✅" : cmd.status === "error" ? "❌" : "⏳";
            return `${index + 1}. ${status} ${cmd.prompt.substring(0, 60)}${cmd.prompt.length > 60 ? "..." : ""}`;
          })
          .join("\n");
        await bot.sendMessage(userChatId, `📋 *Recent Command History*\n\n${historyText}`, { parse_mode: "Markdown" });
      });

      // Handle regular messages (command execution)
      bot.on("message", async (msg) => {
        const userChatId = msg.chat.id.toString();
        chatIdToToken.set(userChatId, token);
        if (msg.text?.startsWith("/")) return; // Skip commands
        if (!allowedChatIds.has(userChatId)) {
          await bot.sendMessage(userChatId, "⛔ Unauthorized. This bot is not enabled for your chat ID.");
          return;
        }
        if (!msg.text) return;

        console.log(`Telegram command received: ${msg.text}`);

        // Store the message for processing
        (global as any).telegramCommandQueue = (global as any).telegramCommandQueue || [];
        (global as any).telegramCommandQueue.push({
          chatId: userChatId,
          prompt: msg.text,
          timestamp: Date.now(),
        });
      });
    }

    isInitialized = bots.size > 0;
    console.log(`Telegram bots initialized successfully: ${bots.size} bot(s)`);
  } catch (error) {
    console.error("Error initializing Telegram bot(s):", error);
    throw error;
  }
}

export async function stopTelegramBot(): Promise<void> {
  for (const botInstance of Array.from(bots.values())) {
    await botInstance.stopPolling();
  }
  bots.clear();
  chatIdToToken.clear();
  isInitialized = false;
  console.log("Telegram bots stopped");
}

export async function sendTelegramMessage(chatId: string, message: string): Promise<void> {
  if (!isInitialized || bots.size === 0) {
    throw new Error("Telegram bot is not initialized");
  }
  const token = chatIdToToken.get(chatId);
  if (token && bots.get(token)) {
    await bots.get(token)!.sendMessage(chatId, message, { parse_mode: "Markdown" });
    return;
  }
  // Fallback: try all bots; first successful send ends
  for (const botInstance of Array.from(bots.values())) {
    try {
      await botInstance.sendMessage(chatId, message, { parse_mode: "Markdown" });
      return;
    } catch {
      // try next bot
    }
  }
}

export async function sendCommandResult(chatId: string, command: Command): Promise<void> {
  if (!isInitialized || bots.size === 0) return;

  const status = command.status === "completed" && command.exitCode === "0" ? "✅ Success" : command.status === "error" ? "❌ Error" : "⏳ Running";

  let message = `*Command Execution*\n\n`;
  message += `📝 Prompt: ${command.prompt}\n`;
  message += `💻 Command: \`${command.generatedCommand}\`\n`;
  message += `📊 Status: ${status}\n`;
  if (command.executionMode) {
    message += `🖥️ Mode: ${command.executionMode === "remote" ? "Remote Kali" : "Local"}\n`;
  }

  await sendTelegramMessage(chatId, message);

  if (command.output) {
    const chunks = command.output.match(/[\s\S]{1,3800}/g) || [];
    for (const chunk of chunks) {
      await sendTelegramMessage(chatId, `\`\`\`\n${chunk}\n\`\`\``);
    }
  }
}

export function isTelegramBotActive(): boolean {
  return isInitialized && bots.size > 0;
}

export async function sendBotInactiveMessage(chatId: string): Promise<void> {
  if (!isInitialized || bots.size === 0) return;
  await sendTelegramMessage(
    chatId,
    "🔴 *Bot is currently inactive*\n\n" +
      "The Telegram bot integration has been disabled by the administrator. " +
      "Please use the web interface to execute commands."
  );
}
