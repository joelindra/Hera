import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { CommandInput } from "@/components/CommandInput";
import { TerminalOutput } from "@/components/TerminalOutput";
import { CommandHistory } from "@/components/CommandHistory";
import { AuthorInfo } from "@/components/AuthorInfo";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Command } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);

  const { data: commands = [] } = useQuery<Command[]>({
    queryKey: ["/api/commands"],
  });

  const executeMutation = useMutation({
    mutationFn: async ({ prompt, timeout }: { prompt: string; timeout?: number }) => {
      const response = await apiRequest("POST", "/api/commands/execute", { prompt, timeout });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menjalankan command",
        variant: "destructive",
      });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/commands");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
      toast({
        title: "History Dihapus",
        description: "Semua command history telah dihapus",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus history",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "execution_start") {
        setIsExecuting(true);
      } else if (data.type === "command_generated" || data.type === "execution_running") {
        // Refresh to show generated command and status updates
        queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
      } else if (data.type === "execution_complete" || data.type === "execution_error") {
        setIsExecuting(false);
        queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
      } else if (data.type === "kali_connected" || data.type === "kali_disconnected") {
        // Refresh client list in header
        queryClient.invalidateQueries({ queryKey: ["/api/kali-clients"] });
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      socket.close();
    };
  }, []);

  const handleExecuteCommand = async (prompt: string, timeout?: number) => {
    setIsExecuting(true);
    await executeMutation.mutateAsync({ prompt, timeout });
  };


  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16 h-screen flex flex-col">
        <div className="flex-1 grid lg:grid-cols-3 gap-0 overflow-hidden">
          <div className="lg:col-span-2 flex flex-col border-r border-border overflow-hidden">
            <CommandInput onSubmit={handleExecuteCommand} isExecuting={isExecuting} />
            <TerminalOutput commands={commands} isExecuting={isExecuting} />
          </div>
          <div className="hidden lg:flex lg:flex-col bg-sidebar overflow-hidden">
            <div className="flex-1 min-h-0 p-4">
              <CommandHistory 
                commands={commands} 
                onClearHistory={() => clearHistoryMutation.mutate()}
                isClearingHistory={clearHistoryMutation.isPending}
              />
            </div>
            <div className="flex-1 min-h-0 p-4 border-t border-border">
              <AuthorInfo />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
