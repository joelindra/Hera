import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Github, Globe, BookOpen } from "lucide-react";
import { SiLinkedin } from "react-icons/si";
import hackerImage from "@assets/stock_images/hacker_drinking_coff_b629c660.jpg";

export function AuthorInfo() {
  return (
    <Card className="h-full bg-card border-card-border">
      <div className="p-4 border-b border-card-border">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm text-foreground">Author</h3>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-full overflow-hidden border-2 border-primary/20">
            <img 
              src={hackerImage} 
              alt="Hacker drinking coffee" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">Joel Indra</h4>
            <p className="text-xs text-muted-foreground">Developer</p>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => window.open("https://joelindra.id", "_blank")}
            data-testid="button-website"
          >
            <Globe className="w-4 h-4" />
            <span className="text-sm">Website</span>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => window.open("https://docs.joelindra.id", "_blank")}
            data-testid="button-documentation"
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-sm">Documentation</span>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => window.open("https://github.com/joelindra", "_blank")}
            data-testid="button-github"
          >
            <Github className="w-4 h-4" />
            <span className="text-sm">GitHub</span>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => window.open("https://www.linkedin.com/in/joelindra", "_blank")}
            data-testid="button-linkedin"
          >
            <SiLinkedin className="w-4 h-4" />
            <span className="text-sm">LinkedIn</span>
          </Button>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            HERA — Incredible Pentest Agent
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            © 2025 All rights reserved
          </p>
        </div>
      </div>
    </Card>
  );
}
