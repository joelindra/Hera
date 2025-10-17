import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { convertPromptToCommand, analyzeCommandSafety } from "./gemini";
import { executeCommand, isCommandAvailable } from "./executor";
import { initializeTelegramBot, stopTelegramBot, sendCommandResult, isTelegramBotActive } from "./telegram";
import { poolDataReader } from "./poolReader";
import { z } from "zod";

const webClients = new Set<WebSocket>();
const kaliClients = new Map<string, WebSocket>(); // clientId -> WebSocket

// Helper function to manage Telegram bot based on settings
async function manageTelegramBot() {
  try {
    const settings = await storage.getAppSettings();
    
    if (settings.telegramEnabled && settings.telegramBotToken && settings.telegramChatId) {
      // Initialize or reinitialize the bot(s) with CSV inputs
      await initializeTelegramBot(settings.telegramBotToken, settings.telegramChatId);
      console.log("Telegram bot initialized");
    } else {
      // Stop the bot if it's running
      await stopTelegramBot();
      console.log("Telegram bot stopped");
    }
  } catch (error) {
    console.error("Error managing Telegram bot:", error);
  }
}

// Process Telegram command queue (check every second)
setInterval(async () => {
  const queue = (global as any).telegramCommandQueue as Array<{chatId: string, prompt: string, timestamp: number}> | undefined;
  if (!queue || queue.length === 0) return;
  
  const settings = await storage.getAppSettings();
  if (!settings.telegramEnabled || !isTelegramBotActive()) return;
  
  const command = queue.shift();
  if (!command) return;
  const originChatId = command.chatId;
  
  // Execute the command via the normal flow
  try {
    const cmd = await storage.createCommand({
      prompt: command.prompt,
      status: "pending",
      generatedCommand: null,
      output: null,
      exitCode: null,
      executionMode: "auto",
      timeout: null,
    });
    
    // Process asynchronously (same as web execution)
    (async () => {
      try {
        const apiKey = settings.personalGeminiApiKey || undefined;
        const generatedCommand = await convertPromptToCommand(command.prompt, apiKey);
        
        await storage.updateCommand(cmd.id, {
          generatedCommand,
          status: "validating",
        });
        
        const safetyCheck = await analyzeCommandSafety(generatedCommand, apiKey);
        // In local environment, we allow most commands. Only block if clearly destructive.
        if (!safetyCheck.isSafe) {
          await storage.updateCommand(cmd.id, {
            status: "error",
            output: `Command blocked for safety reasons: ${safetyCheck.reason}`,
            exitCode: "-1",
          });
          await sendCommandResult(command.chatId, await storage.getCommand(cmd.id) as any);
          return;
        }
        
        const clients = await storage.getKaliClients();
        const connectedClient = clients.find(c => c.connected);
        
        if (connectedClient) {
          await storage.updateCommand(cmd.id, {
            status: "executing",
            executionMode: "remote",
          });
          
          sendToKaliClient(connectedClient.id, {
            type: "execute",
            commandId: cmd.id,
            command: generatedCommand,
          });
          
          setTimeout(async () => {
            const cmdLatest = await storage.getCommand(cmd.id);
            if (cmdLatest && cmdLatest.status === "executing") {
              await storage.updateCommand(cmd.id, {
                status: "error",
                output: "Command execution timeout (300s)",
                exitCode: "124",
              });
              
              await sendCommandResult(originChatId, await storage.getCommand(cmd.id) as any);
            }
          }, 300000);
        } else {
          if (!isCommandAvailable(generatedCommand)) {
            const baseCmd = generatedCommand.split(" ")[0];
            await storage.updateCommand(cmd.id, {
              status: "error",
              output: `Tool '${baseCmd}' not available. Connect a Kali Linux client or install the tool locally.`,
              exitCode: "127",
              executionMode: "local",
            });
            
            await sendCommandResult(originChatId, await storage.getCommand(cmd.id) as any);
            return;
          }
          
          await storage.updateCommand(cmd.id, {
            status: "executing",
            executionMode: "local",
          });
          
          const result = await executeCommand(generatedCommand, 120);
          
          await storage.updateCommand(cmd.id, {
            status: result.exitCode === 0 ? "completed" : "error",
            output: result.output,
            exitCode: result.exitCode.toString(),
          });
          
          await sendCommandResult(originChatId, await storage.getCommand(cmd.id) as any);
        }
      } catch (error: any) {
        console.error("Telegram command execution error:", error);
        await storage.updateCommand(cmd.id, {
          status: "error",
          output: error.message || "Unknown error",
          exitCode: "-1",
        });
        
        await sendCommandResult(originChatId, await storage.getCommand(cmd.id) as any);
      }
    })();
  } catch (error) {
    console.error("Error processing Telegram command:", error);
  }
}, 1000);

function broadcastToWeb(data: any) {
  const message = JSON.stringify(data);
  webClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function sendToKaliClient(clientId: string, data: any) {
  const client = kaliClients.get(clientId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data));
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve kali-client.py script with unique filename
  app.get("/download/:filename", async (req, res) => {
    const { filename } = req.params;
    // Validate filename format (must be kali-client-*.py)
    if (!filename.match(/^kali-client-.*\.py$/)) {
      return res.status(400).json({ error: "Invalid filename" });
    }
    // Set Content-Disposition header to suggest filename for download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile("kali-client.py", { root: "." });
  });

  // Legacy route for backward compatibility
  app.get("/kali-client.py", async (req, res) => {
    res.sendFile("kali-client.py", { root: "." });
  });

  // Get all commands
  app.get("/api/commands", async (req, res) => {
    try {
      const commands = await storage.getCommands();
      res.json(commands);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Clear all commands
  app.delete("/api/commands", async (req, res) => {
    try {
      await storage.clearCommands();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all Kali clients
  app.get("/api/kali-clients", async (req, res) => {
    try {
      const clients = await storage.getKaliClients();
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create new Kali client (generate token)
  app.post("/api/kali-clients", async (req, res) => {
    try {
      const { name } = z.object({ name: z.string() }).parse(req.body);
      const client = await storage.createKaliClient(name);
      res.json(client);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete Kali client
  app.delete("/api/kali-clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteKaliClient(id);
      if (success) {
        // Disconnect client if connected
        const ws = kaliClients.get(id);
        if (ws) {
          ws.close();
          kaliClients.delete(id);
        }
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Client not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get app settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getAppSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update app settings
  app.post("/api/settings", async (req, res) => {
    try {
      const settings = await storage.updateAppSettings(req.body);
      
      // Manage Telegram bot based on new settings
      await manageTelegramBot();
      
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Test Gemini API connection
  app.post("/api/test-gemini", async (req, res) => {
    try {
      const { apiKey } = z.object({ apiKey: z.string() }).parse(req.body);
      
      // Import GoogleGenAI dynamically
      const { GoogleGenAI } = await import("@google/genai");
      const testAI = new GoogleGenAI({ apiKey });
      
      // Test with a simple prompt
      const result = await testAI.models.generateContent({
        model: "gemini-2.5-pro",
        contents: "Say 'API key is working' if you can read this.",
      });
      
      const response = result.text;
      
      if (response) {
        res.json({ success: true, message: "Connection successful" });
      } else {
        res.status(400).json({ error: "Invalid API response" });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to connect to Gemini API" });
    }
  });

  // Get pool data summary
  app.get("/api/pool/summary", async (req, res) => {
    try {
      const summary = await poolDataReader.getPoolSummary();
      res.json(summary);
    } catch (error: any) {
      console.error("Pool summary error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get full pool data (for RAG context)
  app.get("/api/pool/data", async (req, res) => {
    try {
      const poolData = await poolDataReader.readPoolData();
      res.json(poolData);
    } catch (error: any) {
      console.error("Pool data error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Execute a command (can be local or remote)
  app.post("/api/commands/execute", async (req, res) => {
    try {
      const { prompt, mode = "auto", timeout } = z.object({ 
        prompt: z.string(),
        mode: z.enum(["auto", "local", "remote"]).optional(),
        timeout: z.number().optional()
      }).parse(req.body);

      // Create initial command record
      const command = await storage.createCommand({
        prompt,
        status: "pending",
        generatedCommand: null,
        output: null,
        exitCode: null,
        executionMode: mode,
        timeout: timeout?.toString() ?? null,
      });

      res.json(command);

      // Process asynchronously
      (async () => {
        try {
          broadcastToWeb({ type: "execution_start", commandId: command.id });

          // Get personal API key if set
          const settings = await storage.getAppSettings();
          const apiKey = settings.personalGeminiApiKey || undefined;

          // Step 1: Convert prompt to command using Gemini
          const generatedCommand = await convertPromptToCommand(prompt, apiKey);
          
          await storage.updateCommand(command.id, {
            generatedCommand,
            status: "validating",
          });

          broadcastToWeb({ 
            type: "command_generated", 
            commandId: command.id, 
            command: generatedCommand 
          });

          // Step 2: Analyze command safety
          const safetyCheck = await analyzeCommandSafety(generatedCommand, apiKey);

          if (!safetyCheck.isSafe) {
            await storage.updateCommand(command.id, {
              status: "error",
              output: `Command blocked for safety reasons: ${safetyCheck.reason}`,
              exitCode: "-1",
            });

            broadcastToWeb({
              type: "execution_error",
              commandId: command.id,
              error: safetyCheck.reason,
            });
            return;
          }

          // Step 3: Decide execution mode
          const clients = await storage.getKaliClients();
          const connectedClient = clients.find(c => c.connected);
          
          const shouldUseRemote = mode === "remote" || (mode === "auto" && connectedClient);
          
          if (shouldUseRemote && connectedClient) {
            // Execute on remote Kali Linux
            await storage.updateCommand(command.id, {
              status: "executing",
              executionMode: "remote",
            });

            broadcastToWeb({ type: "execution_running", commandId: command.id, mode: "remote" });

            // Send command to Kali client
            sendToKaliClient(connectedClient.id, {
              type: "execute",
              commandId: command.id,
              command: generatedCommand,
            });

            // Timeout based on user configuration or default 300s
            const remoteTimeout = timeout || 300;
            setTimeout(async () => {
              const cmd = await storage.getCommand(command.id);
              if (cmd && cmd.status === "executing") {
                await storage.updateCommand(command.id, {
                  status: "error",
                  output: `Command execution timeout (${remoteTimeout}s)`,
                  exitCode: "124",
                });
                broadcastToWeb({
                  type: "execution_error",
                  commandId: command.id,
                  error: "Timeout",
                });
              }
            }, remoteTimeout * 1000);
          } else {
            // Execute locally
            if (!isCommandAvailable(generatedCommand)) {
              const baseCmd = generatedCommand.split(" ")[0];
              await storage.updateCommand(command.id, {
                status: "error",
                output: `Tool '${baseCmd}' not available. Connect a Kali Linux client or install the tool locally.`,
                exitCode: "127",
                executionMode: "local",
              });

              broadcastToWeb({
                type: "execution_error",
                commandId: command.id,
                error: `Tool not found: ${baseCmd}`,
              });
              return;
            }

            await storage.updateCommand(command.id, {
              status: "executing",
              executionMode: "local",
            });

            broadcastToWeb({ type: "execution_running", commandId: command.id, mode: "local" });

            const localTimeout = timeout || 120;
            const result = await executeCommand(generatedCommand, localTimeout);

            await storage.updateCommand(command.id, {
              status: result.exitCode === 0 ? "completed" : "error",
              output: result.output,
              exitCode: result.exitCode.toString(),
            });

            broadcastToWeb({
              type: result.exitCode === 0 ? "execution_complete" : "execution_error",
              commandId: command.id,
              output: result.output,
              exitCode: result.exitCode,
            });
          }
        } catch (error: any) {
          console.error("Execution error:", error);
          await storage.updateCommand(command.id, {
            status: "error",
            output: error.message || "Unknown error occurred",
            exitCode: "-1",
          });

          broadcastToWeb({
            type: "execution_error",
            commandId: command.id,
            error: error.message,
          });
        }
      })();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for web clients (noServer mode)
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws) => {
    console.log("Web client connected");
    webClients.add(ws);

    ws.on("close", () => {
      console.log("Web client disconnected");
      webClients.delete(ws);
    });

    ws.on("error", (error) => {
      console.error("Web client error:", error);
      webClients.delete(ws);
    });
  });

  // WebSocket server for Kali Linux clients (noServer mode)
  const kaliWss = new WebSocketServer({ noServer: true });

  kaliWss.on("connection", async (ws, req) => {
    console.log("Kali client attempting connection");

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "auth") {
          // Authenticate client
          const client = await storage.getKaliClientByToken(message.token);
          
          if (client) {
            kaliClients.set(client.id, ws);
            await storage.updateKaliClient(client.id, {
              connected: true,
              lastSeen: new Date(),
              hostname: message.hostname,
              os: message.os,
            });

            ws.send(JSON.stringify({ type: "auth_success", clientId: client.id }));
            broadcastToWeb({ type: "kali_connected", client });
            
            console.log(`Kali client authenticated: ${client.name}`);
          } else {
            ws.send(JSON.stringify({ type: "auth_failed", error: "Invalid token" }));
            ws.close();
          }
        } else if (message.type === "result") {
          // Receive execution result from Kali
          const { commandId, output, exitCode } = message;
          
          await storage.updateCommand(commandId, {
            status: exitCode === 0 ? "completed" : "error",
            output,
            exitCode: exitCode.toString(),
          });

          broadcastToWeb({
            type: exitCode === 0 ? "execution_complete" : "execution_error",
            commandId,
            output,
            exitCode,
          });
        } else if (message.type === "ping") {
          // Update last seen
          const clientEntry = Array.from(kaliClients.entries()).find(([_, wsClient]) => wsClient === ws);
          if (clientEntry) {
            await storage.updateKaliClient(clientEntry[0], { lastSeen: new Date() });
          }
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch (error) {
        console.error("Kali client message error:", error);
      }
    });

    ws.on("close", async () => {
      const clientEntry = Array.from(kaliClients.entries()).find(([_, wsClient]) => wsClient === ws);
      if (clientEntry) {
        const [clientId] = clientEntry;
        kaliClients.delete(clientId);
        await storage.updateKaliClient(clientId, { connected: false });
        broadcastToWeb({ type: "kali_disconnected", clientId });
        console.log("Kali client disconnected");
      }
    });

    ws.on("error", (error) => {
      console.error("Kali client error:", error);
    });
  });

  // Handle WebSocket upgrade manually
  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;

    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else if (pathname === '/kali-ws') {
      kaliWss.handleUpgrade(request, socket, head, (ws) => {
        kaliWss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Initialize Telegram bot on startup if enabled
  manageTelegramBot().catch(err => {
    console.error("Failed to initialize Telegram bot on startup:", err);
  });

  return httpServer;
}
