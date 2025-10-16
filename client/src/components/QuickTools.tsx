import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wrench, Radar, Network, Search, Globe, Database } from "lucide-react";
import { quickTools } from "@shared/schema";

interface QuickToolsProps {
  onSelectTool: (toolName: string) => void;
}

const iconMap: Record<string, any> = {
  radar: Radar,
  network: Network,
  search: Search,
  dns: Globe,
  web: Globe,
  database: Database,
};

export function QuickTools({ onSelectTool }: QuickToolsProps) {
  return (
    <Card className="h-full bg-card border-card-border">
      <div className="p-4 border-b border-card-border">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm text-foreground">Quick Tools</h3>
        </div>
      </div>
      <ScrollArea className="h-[calc(100%-57px)]">
        <div className="p-3 space-y-2">
          {quickTools.map((tool) => {
            const Icon = iconMap[tool.icon];
            return (
              <Button
                key={tool.id}
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => onSelectTool(tool.name)}
                data-testid={`button-tool-${tool.id}`}
              >
                <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-foreground">{tool.name}</p>
                  <p className="text-xs text-muted-foreground">{tool.description}</p>
                </div>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
