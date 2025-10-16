import { useState, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Clock } from "lucide-react";

interface CommandInputProps {
  onSubmit: (prompt: string, timeout?: number) => void;
  isExecuting: boolean;
}

export function CommandInput({ onSubmit, isExecuting }: CommandInputProps) {
  const [prompt, setPrompt] = useState("");
  const [timeout, setTimeout] = useState<string>("120");

  const handleSubmit = () => {
    if (prompt.trim() && !isExecuting) {
      const timeoutNum = parseInt(timeout) || 120;
      onSubmit(prompt.trim(), timeoutNum);
      setPrompt("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4 bg-card border-b border-card-border">
      <div className="space-y-3">
        <label htmlFor="command-input" className="text-sm font-medium text-foreground">
          Enter Prompt for Kali Linux
        </label>
        <div className="flex gap-3">
          <Textarea
            id="command-input"
            data-testid="input-command"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Example: Scan ports 80 and 443 on 192.168.1.1 using nmap..."
            className="font-mono text-sm min-h-24 resize-none bg-terminal text-foreground placeholder:text-muted-foreground"
            disabled={isExecuting}
          />
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                value={timeout}
                onChange={(e) => setTimeout(e.target.value)}
                placeholder="120"
                min="10"
                max="600"
                className="w-20 text-sm"
                disabled={isExecuting}
                data-testid="input-timeout"
              />
              <span className="text-xs text-muted-foreground">sec</span>
            </div>
            <Button
              data-testid="button-execute"
              onClick={handleSubmit}
              disabled={!prompt.trim() || isExecuting}
              size="lg"
            >
              {isExecuting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Press Ctrl+Enter or Cmd+Enter to execute
        </p>
      </div>
    </div>
  );
}
