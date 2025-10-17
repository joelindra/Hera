import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "@/pages/Home";
import Settings from "@/pages/Settings";
import HowToUse from "@/pages/HowToUse";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/settings" component={Settings} />
      <Route path="/how-to-use" component={HowToUse} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Establish WebSocket connection at app level to persist across route changes
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "execution_start") {
          // Broadcast to all components that might need this
          window.dispatchEvent(new CustomEvent('execution_start', { detail: data }));
        } else if (data.type === "command_generated" || data.type === "execution_running") {
          // Refresh to show generated command and status updates
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
          }, 0);
          window.dispatchEvent(new CustomEvent('execution_update', { detail: data }));
        } else if (data.type === "execution_complete" || data.type === "execution_error") {
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
          }, 0);
          window.dispatchEvent(new CustomEvent('execution_complete', { detail: data }));
        } else if (data.type === "kali_connected" || data.type === "kali_disconnected") {
          // Refresh client list in header
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["/api/kali-clients"] });
          }, 0);
          window.dispatchEvent(new CustomEvent('kali_status_change', { detail: data }));
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = (event) => {
      console.log("WebSocket disconnected:", event.code, event.reason);
    };

    return () => {
      socket.close();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
