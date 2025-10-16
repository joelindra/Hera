import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";
import type { Command } from "@shared/schema";

let bot: TelegramBot | null = null;
let isInitialized = false;

export async function initializeTelegramBot(token: string, chatId: string): Promise<void> {
  try {
    // Stop existing bot if any
    if (bot) {
      await bot.stopPolling();
      bot = null;
    }

    // Create new bot instance
    bot = new TelegramBot(token, { polling: true });
    isInitialized = true;

    console.log("Telegram bot initialized successfully");

    // Handle /start command
    bot.onText(/\/start/, async (msg) => {
      const userChatId = msg.chat.id.toString();
      if (userChatId !== chatId) {
        await bot!.sendMessage(userChatId, "⛔ Unauthorized. This bot is configured for a specific chat ID.");
        return;
      }

      await bot!.sendMessage(userChatId, 
        `🤖 *Kali x Tuan Hades MCP Agent Bot*\n\n` +
        `Welcome! This bot allows you to execute Kali Linux commands using natural language.\n\n` +
        `Use /help to see available commands.`,
        { parse_mode: "Markdown" }
      );
    });

    // Handle /help command
    bot.onText(/\/help/, async (msg) => {
      const userChatId = msg.chat.id.toString();
      if (userChatId !== chatId) {
        await bot!.sendMessage(userChatId, "⛔ Unauthorized. This bot is configured for a specific chat ID.");
        return;
      }

      await bot!.sendMessage(userChatId,
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

    // Handle /ping command
    bot.onText(/\/ping/, async (msg) => {
      const userChatId = msg.chat.id.toString();
      if (userChatId !== chatId) {
        await bot!.sendMessage(userChatId, "⛔ Unauthorized. This bot is configured for a specific chat ID.");
        return;
      }

      await bot!.sendMessage(userChatId, "🏓 Pong! Bot is active and ready.");
    });

    // Handle /status command
    bot.onText(/\/status/, async (msg) => {
      const userChatId = msg.chat.id.toString();
      if (userChatId !== chatId) {
        await bot!.sendMessage(userChatId, "⛔ Unauthorized. This bot is configured for a specific chat ID.");
        return;
      }

      const kaliClients = await storage.getKaliClients();
      const connectedClients = kaliClients.filter(c => c.connected);
      
      const status = 
        `📊 *Bot Status*\n\n` +
        `🤖 Bot: Active ✅\n` +
        `🖥️ Kali Clients: ${connectedClients.length} connected / ${kaliClients.length} total\n\n` +
        (connectedClients.length > 0 ? 
          `*Connected Clients:*\n` + connectedClients.map(c => `• ${c.name} (${c.hostname || 'Unknown'})`).join('\n') :
          `No Kali clients connected`);

      await bot!.sendMessage(userChatId, status, { parse_mode: "Markdown" });
    });

    // Handle /history command
    bot.onText(/\/history/, async (msg) => {
      const userChatId = msg.chat.id.toString();
      if (userChatId !== chatId) {
        await bot!.sendMessage(userChatId, "⛔ Unauthorized. This bot is configured for a specific chat ID.");
        return;
      }

      const commands = await storage.getCommands();
      const recentCommands = commands.slice(0, 5);

      if (recentCommands.length === 0) {
        await bot!.sendMessage(userChatId, "📋 No command history available.");
        return;
      }

      const historyText = recentCommands.map((cmd, index) => {
        const status = cmd.status === "completed" && cmd.exitCode === "0" ? "✅" : 
                      cmd.status === "error" ? "❌" : "⏳";
        return `${index + 1}. ${status} ${cmd.prompt.substring(0, 60)}${cmd.prompt.length > 60 ? '...' : ''}`;
      }).join('\n');

      await bot!.sendMessage(userChatId, 
        `📋 *Recent Command History*\n\n${historyText}`,
        { parse_mode: "Markdown" }
      );
    });

    // Handle regular messages (command execution)
    bot.on("message", async (msg) => {
      const userChatId = msg.chat.id.toString();
      
      // Skip if it's a command
      if (msg.text?.startsWith('/')) return;
      
      if (userChatId !== chatId) {
        await bot!.sendMessage(userChatId, "⛔ Unauthorized. This bot is configured for a specific chat ID.");
        return;
      }

      if (!msg.text) return;

      // This will be handled by the main command execution flow
      // We'll emit an event that the routes will listen to
      console.log(`Telegram command received: ${msg.text}`);
      
      // Store the message for processing
      (global as any).telegramCommandQueue = (global as any).telegramCommandQueue || [];
      (global as any).telegramCommandQueue.push({
        chatId: userChatId,
        prompt: msg.text,
        timestamp: Date.now(),
      });
    });

  } catch (error) {
    console.error("Error initializing Telegram bot:", error);
    throw error;
  }
}

export async function stopTelegramBot(): Promise<void> {
  if (bot) {
    await bot.stopPolling();
    bot = null;
    isInitialized = false;
    console.log("Telegram bot stopped");
  }
}

export async function sendTelegramMessage(chatId: string, message: string): Promise<void> {
  if (!bot || !isInitialized) {
    throw new Error("Telegram bot is not initialized");
  }
  
  await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
}

export async function sendCommandResult(chatId: string, command: Command): Promise<void> {
  if (!bot || !isInitialized) return;

  const status = command.status === "completed" && command.exitCode === "0" ? "✅ Success" : 
                command.status === "error" ? "❌ Error" : "⏳ Running";

  let message = `*Command Execution*\n\n`;
  message += `📝 Prompt: ${command.prompt}\n`;
  message += `💻 Command: \`${command.generatedCommand}\`\n`;
  message += `📊 Status: ${status}\n`;
  
  if (command.executionMode) {
    message += `🖥️ Mode: ${command.executionMode === "remote" ? "Remote Kali" : "Local"}\n`;
  }

  await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });

  if (command.output) {
    // Split long output into chunks (Telegram has 4096 char limit)
    const chunks = command.output.match(/[\s\S]{1,3800}/g) || [];
    for (const chunk of chunks) {
      await bot.sendMessage(chatId, `\`\`\`\n${chunk}\n\`\`\``, { parse_mode: "Markdown" });
    }
  }
}

export function isTelegramBotActive(): boolean {
  return isInitialized && bot !== null;
}

export async function sendBotInactiveMessage(chatId: string): Promise<void> {
  if (!bot || !isInitialized) return;
  
  await bot.sendMessage(chatId, 
    "🔴 *Bot is currently inactive*\n\n" +
    "The Telegram bot integration has been disabled by the administrator. " +
    "Please use the web interface to execute commands.",
    { parse_mode: "Markdown" }
  );
}
