import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Plus, Trash2, CheckCircle2, Circle, Terminal, ArrowLeft, Eye, EyeOff, Download, Key, Send, MessageSquare } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { KaliClient, AppSettings } from "@shared/schema";

export default function Settings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [clientName, setClientName] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedSetup, setCopiedSetup] = useState<string | null>(null);
  
  // App settings state
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramEnabled, setTelegramEnabled] = useState(false);

  const { data: clients = [] } = useQuery<KaliClient[]>({
    queryKey: ["/api/kali-clients"],
    refetchInterval: 3000, // Refresh every 3s to update connection status
  });
  
  const { data: appSettings } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
  });
  
  // Update local state when settings are loaded
  useEffect(() => {
    if (appSettings) {
      setGeminiApiKey(appSettings.personalGeminiApiKey || "");
      setTelegramToken(appSettings.telegramBotToken || "");
      setTelegramChatId(appSettings.telegramChatId || "");
      setTelegramEnabled(appSettings.telegramEnabled || false);
    }
  }, [appSettings]);

  // Track which client IDs we've seen before (to distinguish new vs existing)
  const seenClientsRef = useRef<Set<string>>(new Set());
  
  // Initialize hiddenTokens with all client IDs (default to hidden)
  const [hiddenTokens, setHiddenTokens] = useState<Set<string>>(new Set());

  // Update hiddenTokens when new clients are added (only hide NEW clients, preserve user toggles)
  useEffect(() => {
    setHiddenTokens(prev => {
      const newSet = new Set(prev);
      
      // Add only truly NEW clients (not seen before) to hiddenTokens
      clients.forEach(client => {
        if (!seenClientsRef.current.has(client.id)) {
          seenClientsRef.current.add(client.id); // Mark as seen
          newSet.add(client.id); // Hide new clients by default
        }
      });
      
      // Clean up deleted clients from hiddenTokens
      prev.forEach(id => {
        if (!clients.find(c => c.id === id)) {
          newSet.delete(id);
          seenClientsRef.current.delete(id); // Also remove from seen set
        }
      });
      
      return newSet;
    });
  }, [clients.map(c => c.id).join(",")]);

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/kali-clients", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kali-clients"] });
      setClientName("");
      toast({
        title: "Client Created",
        description: "Kali Linux client token successfully created",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/kali-clients/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kali-clients"] });
      toast({
        title: "Client Deleted",
        description: "Kali Linux client successfully deleted",
      });
    },
  });
  
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<AppSettings>) => {
      return await apiRequest("POST", "/api/settings", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Saved",
        description: "Settings have been updated successfully",
      });
    },
  });
  
  const testGeminiMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      return await apiRequest("POST", "/api/test-gemini", { apiKey });
    },
    onSuccess: () => {
      toast({
        title: "Connection Successful",
        description: "Gemini API key is valid and working",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Gemini API",
        variant: "destructive",
      });
    },
  });
  
  const handleSaveGeminiKey = () => {
    updateSettingsMutation.mutate({
      personalGeminiApiKey: geminiApiKey || null,
    });
  };
  
  const handleTestGeminiConnection = async () => {
    if (!geminiApiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter a Gemini API key to test",
        variant: "destructive",
      });
      return;
    }
    await testGeminiMutation.mutateAsync(geminiApiKey);
  };
  
  const handleSaveTelegramSettings = () => {
    updateSettingsMutation.mutate({
      telegramBotToken: telegramToken || null,
      telegramChatId: telegramChatId || null,
      telegramEnabled,
    });
  };

  const toggleTokenVisibility = (id: string) => {
    setHiddenTokens((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedToken(id);
    toast({
      title: "Copied",
      description: "Token copied to clipboard",
    });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const copySetupCommand = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSetup(id);
    toast({
      title: "Copied",
      description: "Setup command copied to clipboard",
    });
    setTimeout(() => setCopiedSetup(null), 2000);
  };

  const getServerUrl = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}`;
  };

  const getSetupCommands = (client: KaliClient, method: "wget" | "curl" | "sh") => {
    const downloadUrl = `${window.location.origin}/download/${client.filename}`;
    const installCmd = "pip install websocket-client";
    const runCmd = `python3 ${client.filename} --token ${client.token} --server ${getServerUrl()}`;

    switch (method) {
      case "wget":
        return `# Download using wget\nwget ${downloadUrl}\n\n# Install dependencies\n${installCmd}\n\n# Run client\n${runCmd}`;
      case "curl":
        return `# Download using curl\ncurl -O ${downloadUrl}\n\n# Install dependencies\n${installCmd}\n\n# Run client\n${runCmd}`;
      case "sh":
        return `# One-line installer (downloads and runs)\ncurl -sSL ${downloadUrl} -o ${client.filename} && ${installCmd} && ${runCmd}`;
      default:
        return "";
    }
  };

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure API keys, integrations, and manage Kali Linux connections
        </p>
      </div>

      {/* Gemini API Settings */}
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Gemini API Configuration
            </h2>
            <p className="text-sm text-muted-foreground">
              Use your personal Gemini API key (optional). If not provided, the default server key will be used.
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Personal Gemini API Key
              </label>
              <div className="flex gap-3">
                <Input
                  type="password"
                  placeholder="AIza... (Leave empty to use server default)"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="flex-1"
                  data-testid="input-gemini-key"
                />
                <Button
                  onClick={handleTestGeminiConnection}
                  disabled={!geminiApiKey.trim() || testGeminiMutation.isPending}
                  variant="outline"
                  data-testid="button-test-gemini"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {testGeminiMutation.isPending ? "Testing..." : "Test"}
                </Button>
                <Button
                  onClick={handleSaveGeminiKey}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-save-gemini"
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Get your API key from{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Telegram Bot Integration */}
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Telegram Bot Integration
              </h2>
              <p className="text-sm text-muted-foreground">
                Execute commands via Telegram bot (when enabled, you can send prompts through both web and Telegram)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {telegramEnabled ? "Enabled" : "Disabled"}
              </span>
              <Switch
                checked={telegramEnabled}
                onCheckedChange={setTelegramEnabled}
                data-testid="switch-telegram-enabled"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Bot Token
              </label>
              <Input
                type="password"
                placeholder="123456:ABC-DEF..."
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                disabled={!telegramEnabled}
                data-testid="input-telegram-token"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Get bot token from{" "}
                <a
                  href="https://t.me/botfather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  @BotFather
                </a>
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Chat ID
              </label>
              <Input
                type="text"
                placeholder="Your Telegram chat ID"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                disabled={!telegramEnabled}
                data-testid="input-telegram-chat-id"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Get your chat ID from{" "}
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  @userinfobot
                </a>
              </p>
            </div>

            <Button
              onClick={handleSaveTelegramSettings}
              disabled={updateSettingsMutation.isPending || (!telegramToken.trim() && telegramEnabled)}
              className="w-full"
              data-testid="button-save-telegram"
            >
              Save Telegram Settings
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-primary" />
              Kali Linux Clients
            </h2>
            <p className="text-sm text-muted-foreground">
              Create tokens to connect your Kali Linux machine via WebSocket
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="Client name (example: Kali-VM-1)"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                data-testid="input-client-name"
              />
              <Button
                onClick={() => createMutation.mutate(clientName)}
                disabled={!clientName.trim() || createMutation.isPending}
                data-testid="button-create-client"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Client
              </Button>
            </div>

            {clients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Terminal className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No clients yet. Create your first client.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clients.map((client) => (
                  <Card key={client.id} className="p-4" data-testid={`client-${client.id}`}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {client.connected ? (
                            <Circle className="w-3 h-3 fill-success text-success" />
                          ) : (
                            <Circle className="w-3 h-3 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium text-foreground">{client.name}</p>
                            {client.hostname && (
                              <p className="text-xs text-muted-foreground">
                                {client.hostname} • {client.os}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={client.connected ? "default" : "outline"}>
                            {client.connected ? "Connected" : "Offline"}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(client.id)}
                            data-testid={`button-delete-${client.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Authentication Token
                        </label>
                        <div className="flex gap-2">
                          <code className="flex-1 p-2 bg-terminal text-xs font-mono text-primary rounded border border-border overflow-x-auto">
                            {hiddenTokens.has(client.id) ? "•".repeat(32) : client.token}
                          </code>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => toggleTokenVisibility(client.id)}
                            data-testid={`button-toggle-token-${client.id}`}
                          >
                            {hiddenTokens.has(client.id) ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => copyToClipboard(client.token, client.id)}
                            data-testid={`button-copy-token-${client.id}`}
                          >
                            {copiedToken === client.id ? (
                              <CheckCircle2 className="w-4 h-4 text-success" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-muted-foreground">
                            Setup Instructions
                          </label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = `${window.location.origin}/download/${client.filename}`;
                              link.download = client.filename;
                              link.click();
                            }}
                            data-testid={`button-download-${client.id}`}
                          >
                            <Download className="w-3 h-3 mr-2" />
                            Download Script
                          </Button>
                        </div>
                        <Tabs defaultValue="wget" className="w-full">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="wget" data-testid={`tab-wget-${client.id}`}>wget</TabsTrigger>
                            <TabsTrigger value="curl" data-testid={`tab-curl-${client.id}`}>curl</TabsTrigger>
                            <TabsTrigger value="sh" data-testid={`tab-sh-${client.id}`}>one-line</TabsTrigger>
                          </TabsList>
                          <TabsContent value="wget" className="mt-2">
                            <div className="bg-terminal p-3 rounded border border-border">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <pre className="flex-1 text-xs font-mono text-foreground whitespace-pre-wrap">
                                  {getSetupCommands(client, "wget")}
                                </pre>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => copySetupCommand(getSetupCommands(client, "wget"), `${client.id}-wget`)}
                                  data-testid={`button-copy-wget-${client.id}`}
                                >
                                  {copiedSetup === `${client.id}-wget` ? (
                                    <CheckCircle2 className="w-4 h-4 text-success" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="curl" className="mt-2">
                            <div className="bg-terminal p-3 rounded border border-border">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <pre className="flex-1 text-xs font-mono text-foreground whitespace-pre-wrap">
                                  {getSetupCommands(client, "curl")}
                                </pre>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => copySetupCommand(getSetupCommands(client, "curl"), `${client.id}-curl`)}
                                  data-testid={`button-copy-curl-${client.id}`}
                                >
                                  {copiedSetup === `${client.id}-curl` ? (
                                    <CheckCircle2 className="w-4 h-4 text-success" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="sh" className="mt-2">
                            <div className="bg-terminal p-3 rounded border border-border">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <pre className="flex-1 text-xs font-mono text-foreground whitespace-pre-wrap">
                                  {getSetupCommands(client, "sh")}
                                </pre>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => copySetupCommand(getSetupCommands(client, "sh"), `${client.id}-sh`)}
                                  data-testid={`button-copy-sh-${client.id}`}
                                >
                                  {copiedSetup === `${client.id}-sh` ? (
                                    <CheckCircle2 className="w-4 h-4 text-success" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-muted/30">
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Important Notes</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Client script will automatically reconnect if connection is lost</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Commands will be executed with the user running the client script</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Ensure your Kali Linux can access this server via internet</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Keep your token secure - anyone with the token can execute commands on your Kali</span>
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
