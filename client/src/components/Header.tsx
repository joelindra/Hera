import { Terminal, Sparkles, Circle, Settings as SettingsIcon, HelpCircle, Moon, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import type { KaliClient } from "@shared/schema";

export function Header() {
  const { theme, toggleTheme } = useTheme();
  
  const { data: clients = [] } = useQuery<KaliClient[]>({
    queryKey: ["/api/kali-clients"],
    refetchInterval: 3000,
  });

  const connectedClient = clients.find(c => c.connected);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-card border-b border-card-border">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 hover-elevate rounded-md px-2 py-1">
          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-md">
            <Terminal className="w-5 h-5 text-primary" data-testid="icon-logo" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground" data-testid="text-app-title">
              Kali x Tuan Hades MCP Agent
            </h1>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Circle className="w-2 h-2 fill-success text-success" data-testid="status-ai" />
            <span className="text-sm text-muted-foreground">AI Connected</span>
          </div>
          <Badge variant="outline" className="gap-2" data-testid="badge-model">
            <Sparkles className="w-3 h-3" />
            Gemini 2.5 Pro
          </Badge>
          
          {connectedClient ? (
            <Badge variant="default" className="gap-2" data-testid="badge-kali-status">
              <Circle className="w-2 h-2 fill-white" />
              Kali: {connectedClient.name}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-2" data-testid="badge-kali-status">
              <Circle className="w-2 h-2" />
              Kali: Offline
            </Badge>
          )}

          <Button
            size="icon"
            variant="ghost"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          <Link href="/how-to-use">
            <Button size="icon" variant="ghost" data-testid="button-help">
              <HelpCircle className="w-5 h-5" />
            </Button>
          </Link>

          <Link href="/settings">
            <Button size="icon" variant="ghost" data-testid="button-settings">
              <SettingsIcon className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
