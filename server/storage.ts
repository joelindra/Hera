import { type Command, type InsertCommand, type KaliClient, type AppSettings, type InsertAppSettings } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getCommands(): Promise<Command[]>;
  getCommand(id: string): Promise<Command | undefined>;
  createCommand(command: InsertCommand): Promise<Command>;
  updateCommand(id: string, updates: Partial<Command>): Promise<Command | undefined>;
  clearCommands(): Promise<void>;
  
  // Kali client management
  getKaliClients(): Promise<KaliClient[]>;
  getKaliClient(id: string): Promise<KaliClient | undefined>;
  getKaliClientByToken(token: string): Promise<KaliClient | undefined>;
  createKaliClient(name: string): Promise<KaliClient>;
  updateKaliClient(id: string, updates: Partial<KaliClient>): Promise<KaliClient | undefined>;
  deleteKaliClient(id: string): Promise<boolean>;
  
  // App settings management
  getAppSettings(): Promise<AppSettings>;
  updateAppSettings(updates: Partial<InsertAppSettings>): Promise<AppSettings>;
}

export class MemStorage implements IStorage {
  private commands: Map<string, Command>;
  private kaliClients: Map<string, KaliClient>;
  private appSettings: AppSettings;

  constructor() {
    this.commands = new Map();
    this.kaliClients = new Map();
    this.appSettings = {
      id: "singleton",
      personalGeminiApiKey: null,
      telegramBotToken: null,
      telegramChatId: null,
      telegramEnabled: false,
      updatedAt: new Date(),
    };
  }

  async getCommands(): Promise<Command[]> {
    return Array.from(this.commands.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getCommand(id: string): Promise<Command | undefined> {
    return this.commands.get(id);
  }

  async createCommand(insertCommand: InsertCommand): Promise<Command> {
    const id = randomUUID();
    const command: Command = {
      id,
      prompt: insertCommand.prompt,
      generatedCommand: insertCommand.generatedCommand ?? null,
      output: insertCommand.output ?? null,
      exitCode: insertCommand.exitCode ?? null,
      status: insertCommand.status ?? "pending",
      executionMode: insertCommand.executionMode ?? null,
      timeout: insertCommand.timeout ?? null,
      createdAt: new Date(),
    };
    this.commands.set(id, command);
    return command;
  }

  async updateCommand(id: string, updates: Partial<Command>): Promise<Command | undefined> {
    const command = this.commands.get(id);
    if (!command) return undefined;

    const updatedCommand = { ...command, ...updates };
    this.commands.set(id, updatedCommand);
    return updatedCommand;
  }

  async clearCommands(): Promise<void> {
    this.commands.clear();
  }

  // Kali client methods
  async getKaliClients(): Promise<KaliClient[]> {
    return Array.from(this.kaliClients.values());
  }

  async getKaliClient(id: string): Promise<KaliClient | undefined> {
    return this.kaliClients.get(id);
  }

  async getKaliClientByToken(token: string): Promise<KaliClient | undefined> {
    return Array.from(this.kaliClients.values()).find(client => client.token === token);
  }

  async createKaliClient(name: string): Promise<KaliClient> {
    const id = randomUUID();
    const token = randomUUID();
    // Generate unique filename based on sanitized client name
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `kali-client-${sanitizedName}-${id.slice(0, 8)}.py`;
    const client: KaliClient = {
      id,
      name,
      token,
      filename,
      connected: false,
      lastSeen: new Date(),
    };
    this.kaliClients.set(id, client);
    return client;
  }

  async updateKaliClient(id: string, updates: Partial<KaliClient>): Promise<KaliClient | undefined> {
    const client = this.kaliClients.get(id);
    if (!client) return undefined;

    const updatedClient = { ...client, ...updates };
    this.kaliClients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteKaliClient(id: string): Promise<boolean> {
    return this.kaliClients.delete(id);
  }

  // App settings methods
  async getAppSettings(): Promise<AppSettings> {
    return this.appSettings;
  }

  async updateAppSettings(updates: Partial<InsertAppSettings>): Promise<AppSettings> {
    this.appSettings = {
      ...this.appSettings,
      ...updates,
      updatedAt: new Date(),
    };
    return this.appSettings;
  }
}

export const storage = new MemStorage();
