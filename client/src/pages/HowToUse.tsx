import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Terminal, Zap, Shield, Globe, Clock, Eye } from "lucide-react";

export default function HowToUse() {
  const [, setLocation] = useLocation();

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
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
            <h1 className="text-2xl font-semibold text-foreground">How to Use</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Complete guide to using Kali x Tuan Hades MCP Agent
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-primary" />
              Getting Started
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Kali x Tuan Hades MCP Agent is a web-based tool that allows you to execute 
                Kali Linux commands using natural language with AI Gemini 2.5 Pro.
              </p>
              <p>
                This tool can run in two modes: <strong>Local</strong> (execute on this server) 
                or <strong>Remote</strong> (execute on your own Kali Linux via WebSocket).
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              How to Use
            </h3>
            <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
              <li>
                <strong>Enter a natural language prompt</strong> in the input field on the main page
                <div className="ml-6 mt-1 text-xs">
                  Example: "Scan ports 80 and 443 on 192.168.1.1 using nmap"
                </div>
              </li>
              <li>
                <strong>Set timeout</strong> (optional) - default 120 seconds, maximum 600 seconds
                <div className="ml-6 mt-1 text-xs">
                  For intensive scans like nmap with vulnerability scripts, use higher timeout
                </div>
              </li>
              <li>
                <strong>Press Enter</strong> or click the send button to execute
              </li>
              <li>
                <strong>View results</strong> appearing in the terminal output in real-time
              </li>
            </ol>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Connecting Remote Kali Linux
            </h3>
            <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
              <li>
                <strong>Open Settings page</strong> (⚙️ icon in header)
              </li>
              <li>
                <strong>Create new client</strong> with a descriptive name (example: "Kali-VM-1")
              </li>
              <li>
                <strong>Copy authentication token</strong> that is generated (click copy icon)
              </li>
              <li>
                <strong>On your Kali Linux</strong>, choose one of the download methods:
                <ul className="ml-6 mt-1 space-y-1 list-disc list-inside text-xs">
                  <li>wget - download using wget</li>
                  <li>curl - download using curl</li>
                  <li>one-line - automatic installer in one command</li>
                  <li>Download Script button - direct download via browser</li>
                </ul>
              </li>
              <li>
                <strong>Run the client script</strong> with the copied token
              </li>
              <li>
                <strong>Verify connection</strong> - "Kali: Connected" badge will appear in header
              </li>
            </ol>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Security Testing Tools
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                This tool supports <strong>ALL</strong> Kali Linux security testing tools without 
                restrictions, including:
              </p>
              <ul className="ml-6 space-y-1 list-disc list-inside text-xs">
                <li>nmap (with all scripts including --script vuln, --script exploit)</li>
                <li>sqlmap - SQL injection testing</li>
                <li>nikto - web server vulnerability scanner</li>
                <li>metasploit - penetration testing framework</li>
                <li>burpsuite, hydra, john, aircrack-ng, and other tools</li>
              </ul>
              <p className="mt-2">
                <strong>Safety System:</strong> EXTREMELY DESTRUCTIVE commands will be blocked 
                (example: mkfs, rm -rf /, dd if=/dev/zero). However, ALL penetration testing 
                tools are allowed as this environment is for local testing.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Custom Timeout
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                You can set execution timeout for each command:
              </p>
              <ul className="ml-6 space-y-1 list-disc list-inside text-xs">
                <li><strong>Minimum:</strong> 10 seconds</li>
                <li><strong>Default:</strong> 120 seconds (local), 300 seconds (remote)</li>
                <li><strong>Maximum:</strong> 600 seconds (10 minutes)</li>
              </ul>
              <p className="mt-2">
                Use higher timeout for:
              </p>
              <ul className="ml-6 space-y-1 list-disc list-inside text-xs">
                <li>Full network scan with nmap</li>
                <li>Vulnerability assessment with nikto</li>
                <li>SQL injection testing with sqlmap</li>
                <li>Brute force testing with hydra</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Tips & Tricks
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside ml-4">
              <li>
                <strong>Keyboard Shortcut:</strong> Press Ctrl+Enter (Windows/Linux) or Cmd+Enter (Mac) 
                to execute command immediately
              </li>
              <li>
                <strong>Hide Token:</strong> Authentication token is hidden by default for security. 
                Click eye icon to show/hide
              </li>
              <li>
                <strong>Download Options:</strong> There are 4 ways to download client script - choose 
                whichever is most convenient for you
              </li>
              <li>
                <strong>Minimize Output:</strong> Click chevron icon to collapse/expand command output 
                to keep terminal clean
              </li>
              <li>
                <strong>Clear History:</strong> Use trash button in Command History to clear 
                all history
              </li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-muted/30">
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">⚠️ Important Notes</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                This tool is <strong>ONLY</strong> for testing in local/controlled environments. 
                Do not use to attack systems without permission.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                Command history is stored in server memory - will be lost when server restarts
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                WebSocket client will auto-reconnect if connection is lost
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                Keep your authentication token secure - anyone with the token can execute commands 
                on your Kali Linux
              </span>
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
