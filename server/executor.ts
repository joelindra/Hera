import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ExecutionResult {
  output: string;
  exitCode: number;
  error?: string;
}

export async function executeCommand(command: string, timeoutSeconds: number = 120): Promise<ExecutionResult> {
  try {
    // Use custom timeout or default 120 seconds for command execution (security tools can take time)
    const { stdout, stderr } = await execAsync(command, {
      timeout: timeoutSeconds * 1000,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer for larger outputs
    });

    const output = stdout || stderr || "Command executed successfully with no output";
    
    return {
      output: output.trim(),
      exitCode: 0,
    };
  } catch (error: any) {
    // Command failed or timed out
    const output = error.stdout || error.stderr || error.message || "Command execution failed";
    const exitCode = error.code || 1;

    return {
      output: output.trim(),
      exitCode,
      error: error.message,
    };
  }
}

export function isCommandAvailable(command: string): boolean {
  const baseCommand = command.split(" ")[0];
  
  // List of common Kali Linux tools
  const kaliTools = [
    "nmap", "netcat", "nc", "whois", "dig", "nslookup", "nikto",
    "sqlmap", "metasploit", "msfconsole", "hydra", "john",
    "aircrack-ng", "wireshark", "tcpdump", "ettercap",
    "ping", "traceroute", "curl", "wget", "host", "arp-scan"
  ];

  return kaliTools.includes(baseCommand);
}
