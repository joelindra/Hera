import { GoogleGenAI } from "@google/genai";
import { poolDataReader } from "./poolReader";
import { storage } from "./storage";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const defaultAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function convertPromptToCommand(prompt: string, apiKey?: string): Promise<string> {
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : defaultAI;
  
  // Check if data pool is enabled and get context
  let poolContext = "";
  try {
    const settings = await storage.getAppSettings();
    if (settings.dataPoolEnabled) {
      const poolData = await poolDataReader.readPoolData();
      if (poolData.files.length > 0) {
        poolContext = poolDataReader.formatForAI(poolData);
      }
    }
  } catch (error) {
    console.warn("Failed to load pool data:", error);
  }

  const systemPrompt = `You are a Kali Linux command expert. Convert natural language requests into proper Kali Linux commands.

Rules:
1. Return ONLY the command without explanations
2. Use safe, non-destructive commands when possible
3. For network scanning, use appropriate tools like nmap, netcat, whois, dig
4. Always include proper flags and options
5. If the request is unclear, generate the most reasonable command
6. DO NOT include sudo unless absolutely necessary
7. Return just the command string, no markdown, no code blocks

${poolContext ? `\nAdditional Context from Data Pool:\n${poolContext}\n` : ""}

Examples:
Input: "Scan port 80 dan 443 pada 192.168.1.1"
Output: nmap -p 80,443 192.168.1.1

Input: "Cek DNS record untuk google.com"
Output: dig google.com

Input: "Lihat informasi whois dari domain example.com"
Output: whois example.com

Now convert this prompt to a command:
${prompt}`;

  try {
    // Retry logic for transient errors (e.g., 503 UNAVAILABLE)
    const maxAttempts = 3;
    let lastError: any = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-pro",
          contents: systemPrompt,
        });

        const text = response.text;
        if (!text) {
          throw new Error("No response text from Gemini AI");
        }

        const cleaned = text
          .trim()
          .replace(/^```(?:bash|sh|shell)?\n?/gm, "")
          .replace(/\n?```$/gm, "")
          .trim();

        if (!cleaned) {
          throw new Error("Empty command after processing");
        }
        return cleaned;
      } catch (err: any) {
        lastError = err;
        const message = String(err?.message ?? err);
        const isOverloaded = message.includes('status":"UNAVAILABLE"') || message.includes("503") || message.includes("overloaded");
        if (attempt < maxAttempts && isOverloaded) {
          const delay = 300 * attempt; // simple backoff
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        // For API key errors, provide a clearer message
        const isApiKey = message.includes("API Key not found") || message.includes("API_KEY_INVALID");
        if (isApiKey) {
          throw new Error("Gemini API key invalid or missing. Set a valid key in Settings or server env GEMINI_API_KEY.");
        }
        throw err;
      }
    }
    throw lastError;
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error(`Failed to convert prompt to command: ${error}`);
  }
}

export async function analyzeCommandSafety(command: string, apiKey?: string): Promise<{
  isSafe: boolean;
  reason?: string;
}> {
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : defaultAI;
  const systemPrompt = `You are a security expert analyzing Kali Linux commands for safety in a LOCAL ENVIRONMENT.

IMPORTANT CONTEXT: This Kali Linux system runs LOCALLY on the user's own machine, NOT in a cloud or public environment. The user has full control and permission.

ONLY block commands that are EXTREMELY DESTRUCTIVE to the LOCAL SYSTEM itself:
1. Commands that wipe/format drives (mkfs, dd if=/dev/zero, fdisk with write operations)
2. Commands that delete critical system files (rm -rf / or /boot or /etc with recursive flags)
3. Commands that brick the system (overwriting bootloader, kernel panic triggers)

ALLOW ALL SECURITY TESTING COMMANDS including:
- All nmap scripts (--script vuln, --script exploit, etc.) - these are legitimate security testing tools
- Intrusive scans and vulnerability assessments - user owns the target
- All penetration testing tools (sqlmap, nikto, metasploit, burpsuite, etc.)
- Network reconnaissance and exploitation tools
- DoS/stress testing tools - user tests their own infrastructure
- Any Kali Linux security tools with ANY flags

If unsure, ALLOW the command. This is a controlled local environment for security research.

Respond with JSON only: {"isSafe": boolean, "reason": "explanation if unsafe"}

Analyze this command: ${command}`;

  // Local fallback: block only clearly destructive patterns
  const destructivePatterns: RegExp[] = [
    /rm\s+-rf\s+\/(\s|$)/i,
    /mkfs\w*\s+/i,
    /dd\s+if=\/dev\/zero/i,
    /:\(\)\s*\{\s*:\|:\&\s*\};\s*:/, // fork bomb
    /\b(format|diskpart)\b/i,
  ];
  const matchesDestructive = destructivePatterns.some((re) => re.test(command));
  if (matchesDestructive) {
    return { isSafe: false, reason: "Detected clearly destructive operation for local system" };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: { isSafe: { type: "boolean" }, reason: { type: "string" } },
          required: ["isSafe"],
        },
      },
      contents: systemPrompt,
    });

    const text = response.text;
    if (!text) {
      // Default to allow in local env if analysis empty
      return { isSafe: true };
    }

    const parsed = JSON.parse(text);
    if (typeof parsed.isSafe !== "boolean") {
      return { isSafe: true };
    }
    return { isSafe: parsed.isSafe, reason: parsed.reason || undefined };
  } catch (error: any) {
    const message = String(error?.message ?? error);
    const isOverloaded = message.includes('status":"UNAVAILABLE"') || message.includes("503") || message.includes("overloaded");
    if (isOverloaded) {
      // Allow by default on transient analysis failures
      return { isSafe: true };
    }
    const isApiKey = message.includes("API Key not found") || message.includes("API_KEY_INVALID");
    if (isApiKey) {
      // Allow but include reason for visibility
      return { isSafe: true, reason: "Safety analysis skipped due to missing/invalid API key" };
    }
    console.error("Safety analysis error:", error);
    // Default to allow in local environment
    return { isSafe: true };
  }
}
