import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle2, XCircle, AlertCircle, Terminal as TerminalIcon, Cloud, Laptop, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { Command } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface TerminalOutputProps {
  commands: Command[];
  isExecuting: boolean;
}

export function TerminalOutput({ commands, isExecuting }: TerminalOutputProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({
      title: "Copied",
      description: "Output has been copied to clipboard",
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleCollapse = (id: string) => {
    setCollapsedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: string, exitCode: string | null) => {
    if (status === "executing") {
      return <AlertCircle className="w-4 h-4 text-warning animate-pulse" />;
    }
    if (status === "completed" && exitCode === "0") {
      return <CheckCircle2 className="w-4 h-4 text-success" />;
    }
    if (status === "error" || (exitCode && exitCode !== "0")) {
      return <XCircle className="w-4 h-4 text-destructive" />;
    }
    return <TerminalIcon className="w-4 h-4 text-muted-foreground" />;
  };

  const getOutputColor = (status: string, exitCode: string | null) => {
    if (status === "executing") return "text-warning";
    if (status === "completed" && exitCode === "0") return "text-success";
    if (status === "error" || (exitCode && exitCode !== "0")) return "text-destructive";
    return "text-foreground";
  };

  const getExecutionModeIcon = (mode?: string | null) => {
    if (mode === "remote") {
      return <Cloud className="w-3 h-3" />;
    }
    return <Laptop className="w-3 h-3" />;
  };

  const getExecutionModeLabel = (mode?: string | null) => {
    if (mode === "remote") return "Remote Kali";
    return "Local";
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-terminal">
      <div className="space-y-4">
        {commands.length === 0 && !isExecuting ? (
          <div className="flex flex-col items-center justify-center min-h-96 text-center">
            <TerminalIcon className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Commands Yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Start by entering a prompt above. AI will convert your command
              into Kali Linux command and execute it.
            </p>
          </div>
        ) : (
          commands.map((cmd) => {
            const isCollapsed = collapsedIds.has(cmd.id);
            
            return (
              <Card
                key={cmd.id}
                className="p-4 bg-card border-card-border"
                data-testid={`card-command-${cmd.id}`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {getStatusIcon(cmd.status, cmd.exitCode)}
                        <span className="text-xs text-muted-foreground">
                          {new Date(cmd.createdAt).toLocaleString("en-US")}
                        </span>
                        <Badge variant="outline" className="gap-1 text-xs">
                          {getExecutionModeIcon(cmd.executionMode)}
                          {getExecutionModeLabel(cmd.executionMode)}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground mb-2" data-testid={`text-prompt-${cmd.id}`}>
                        {cmd.prompt}
                      </p>
                      {!isCollapsed && cmd.generatedCommand && (
                        <div className="bg-terminal p-2 rounded-md border border-border">
                          <code className="text-sm font-mono text-primary" data-testid={`text-command-${cmd.id}`}>
                            $ {cmd.generatedCommand}
                          </code>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {cmd.output && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleCollapse(cmd.id)}
                          data-testid={`button-toggle-${cmd.id}`}
                        >
                          {isCollapsed ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronUp className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      {cmd.output && !isCollapsed && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(cmd.output || "", cmd.id)}
                          data-testid={`button-copy-${cmd.id}`}
                        >
                          {copiedId === cmd.id ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {!isCollapsed && cmd.output && (
                    <div className="bg-terminal p-3 rounded-md border border-border">
                      <pre
                        className={`text-xs font-mono whitespace-pre-wrap break-all ${getOutputColor(cmd.status, cmd.exitCode)}`}
                        data-testid={`text-output-${cmd.id}`}
                      >
                        {cmd.output}
                      </pre>
                    </div>
                  )}

                  {cmd.status === "executing" && (
                    <div className="flex items-center gap-2 text-warning">
                      <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                      <span className="text-xs">
                        Executing{cmd.executionMode === "remote" ? " on your Kali Linux" : " locally"}...
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
