import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, CheckCircle2, XCircle, AlertCircle, Trash2 } from "lucide-react";
import type { Command } from "@shared/schema";

interface CommandHistoryProps {
  commands: Command[];
  onClearHistory?: () => void;
  isClearingHistory?: boolean;
}

export function CommandHistory({ commands, onClearHistory, isClearingHistory }: CommandHistoryProps) {
  const getStatusIcon = (status: string, exitCode: string | null) => {
    if (status === "executing") {
      return <AlertCircle className="w-3 h-3 text-warning" />;
    }
    if (status === "completed" && exitCode === "0") {
      return <CheckCircle2 className="w-3 h-3 text-success" />;
    }
    if (status === "error" || (exitCode && exitCode !== "0")) {
      return <XCircle className="w-3 h-3 text-destructive" />;
    }
    return <Clock className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <Card className="h-full bg-card border-card-border">
      <div className="p-4 border-b border-card-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm text-foreground">Command History</h3>
          </div>
          {commands.length > 0 && onClearHistory && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onClearHistory}
              disabled={isClearingHistory}
              data-testid="button-clear-history"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className="h-[calc(100%-57px)]">
        <div className="p-3 space-y-2">
          {commands.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No history yet
            </p>
          ) : (
            commands
              .slice()
              .reverse()
              .map((cmd) => (
                <div
                  key={cmd.id}
                  className="p-2 rounded-md hover-elevate border border-card-border cursor-pointer"
                  data-testid={`history-item-${cmd.id}`}
                >
                  <div className="flex items-start gap-2">
                    {getStatusIcon(cmd.status, cmd.exitCode)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground line-clamp-2 mb-1">
                        {cmd.prompt}
                      </p>
                      {cmd.generatedCommand && (
                        <code className="text-[10px] font-mono text-primary line-clamp-1">
                          {cmd.generatedCommand}
                        </code>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(cmd.createdAt).toLocaleTimeString("en-US")}
                      </p>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
