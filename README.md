![download](https://github.com/user-attachments/assets/a5f8c37e-0c32-4415-99ab-b6df4b6698d8)

# Kali Linux x Tuan Hades MCP Agent

Run Kali Linux security tools by describing what you want in natural language. This web-based MCP (Model Context Protocol) Agent turns prompts into safe, executable commands using Gemini 2.5 Pro, streams live results, and can execute remotely on your own Kali machine via WebSocket.

> Developed an AI-powered pentesting tool, 'AI MCP', featuring a professional terminal interface. The frontend was built with React, TypeScript, and Tailwind CSS, while the backend utilized Express. Implemented Gemini AI to translate natural language prompts into executable commands, with real-time output streamed via WebSockets and optional integration with a Telegram bot."

---

## ✨ Features

- **Natural language → Kali command**: Gemini 2.5 Pro converts prompts into precise commands.
- **Remote Kali execution (WebSocket)**: Pair the app with your Kali box using the included Python client.
- **Real-time streaming output**: Watch command output as it happens in the browser.
- **Dual modes**: Remote (Kali client) or Local (server) execution with clear status badges.
- **Safety guardrails**: Context-aware validation to prevent obviously destructive system commands.
- **Professional terminal UI**: Dark-first theme, terminal styling, result collapse/expand, and history.
- **Quick Tools**: Nmap, Netcat, Whois, Dig, Nikto, SQLMap helpers.
- **Personal API key support**: Use your own Gemini API key (per-user setting).
- **Telegram bot integration (optional)**: Send prompts and receive results in Telegram.

---

## 🧠 How it works

1. You enter a prompt (e.g., "Scan ports 80 and 443 on example.com").
2. Backend asks Gemini to generate the exact Kali command.
3. Command is validated for safety and tool availability.
4. If a Kali client is connected, the command is sent via `/kali-ws` and executed on your machine; otherwise runs locally on the server.
5. Output streams back over WebSocket to the browser in real-time.

High-level flow:

```
Prompt → Gemini (command + safety) → choose mode (remote/local) → execute → stream results
```

---

## 🗂️ Tech & Architecture

- **Client**: React 18, TypeScript, Vite 7, TailwindCSS, shadcn/ui, Radix UI, TanStack Query
- **Server**: Node.js, Express, WebSocket (`ws`), Passport (future-ready), Drizzle ORM (future-ready)
- **AI**: `@google/genai` (Gemini 2.5 Pro)
- **Remote client**: Lightweight Python script using `websocket-client`
- **Integration**: Optional Telegram bot via `node-telegram-bot-api`

Repo layout:

```
client/           # React app (UI, pages, components)
server/           # Express server, routes, Gemini integration, WebSocket
kali-client.py    # Remote client for your Kali machine
```

Key server files:
- `server/gemini.ts`: prompt → command, safety analysis
- `server/executor.ts`: process execution and streaming
- `server/routes.ts`: REST APIs + WebSocket endpoints (`/ws`, `/kali-ws`)
- `server/telegram.ts`: Telegram bot integration

---

## 🚀 Quick Start

Prereqs:
- Node.js 18+ (or 20+ recommended)
- npm 9+

1) Install

```bash
npm install
```

2) Run in development

```bash
# Starts Express with tsx and serves the Vite client
npm run dev
```

3) Build for production

```bash
npm run build
```

4) Start production server

```bash
npm start
```

> The dev script uses `tsx` to run `server/index.ts`. Build bundles the client with Vite and the server with esbuild.

---

## 🔐 Environment Variables

Set these in your environment (or a `.env` you load before starting):

- `GEMINI_API_KEY` (required): Google Gemini API key. You can set a personal key in Settings; the server will fall back to this env var if not provided.
- `SESSION_SECRET` (recommended): Express session secret. If omitted, it is auto-generated at runtime.

> Get a Gemini API key from Google AI Studio: https://aistudio.google.com/app/apikey

---

## 🌐 Remote Kali Connection (WebSocket)

Execute commands on your own Kali machine. Steps:

1) In the web app, open Settings and create a new client to get a token.
2) On your Kali box:

```bash
# Download the client script
wget https://your-server.example.com/kali-client.py

# Install dependency
pip install websocket-client

# Run the client
python3 kali-client.py --token YOUR_TOKEN --server wss://your-server.example.com
```

3) Verify:
- Browser shows "Kali: Connected" with your client name.
- Terminal output on Kali: "Authenticated successfully".

The client auto-reconnects, sends heartbeats, and streams results back.

Security notes:
- Keep your token secret. Revoke and reissue if compromised.
- Run the client under the user with the permissions you intend to grant.

> Detailed guide: see `README_KALI_CONNECTION.md`.

---

## 💬 Telegram Bot (Optional)

- Configure in Settings with your Telegram bot token and chat ID.
- Available commands: `/start`, `/help`, `/ping`, `/status`, `/history`.
- Send any natural-language message to execute a command and receive the result.

---

## 🖥️ Using the App

- Open the app in your browser, type a prompt like:
  - "Scan port 80 and 443 on google.com" → `nmap -p 80,443 google.com`
  - "Check DNS records for google.com" → `dig google.com`
  - "Lookup whois for facebook.com" → `whois facebook.com`
- Watch live output; expand/collapse results; view command history.
- Switch execution mode per command: Auto, Local, Remote.
- Manage clients and API keys in Settings.

---

## 🛡️ Safety & Limitations

- The app performs basic safety validation and tool availability checks.
- Pen-testing tools are allowed in local environments.
- You are responsible for complying with laws and policies when using security tools.

---

## 🗺️ Roadmap (selected)

- Persistent database storage (PostgreSQL)
- Multi-user auth and roles
- Command templates and saved prompts
- Export results (PDF/JSON/CSV)
- Multi-session parallel execution
- Full MCP protocol implementation
- Output syntax highlighting

---

## 📄 License
```
Original: MIT
Legend: Hades [ Joel Indra ]
```
---

## 🙌 Acknowledgements

- Google Gemini 2.5 Pro (`@google/genai`)
- React, Vite, TailwindCSS, Radix UI, shadcn/ui
- ws, express, tanstack/query

---

## 🤝 How to Contribute
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.
If you have a suggestion that would make this project better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!
```
Getting Started
1. Fork the project repository.

2. Create your feature branch:
git checkout -b feature/AmazingFeature

3. Install dependencies (if you haven't already):
npm install

4. Make your changes and commit them with a descriptive message:
git commit -m 'feat: Add some AmazingFeature'

5. Push your changes to your forked repository's branch:
git push origin feature/AmazingFeature

6. Open a Pull Request against the main branch of the original repository.

Guidelines:
- Please provide a clear and detailed description of your changes in the pull request.
- If your PR addresses an open issue, please link to it (e.g., "Closes #123").
- Ensure your code is well-formatted and follows the existing style.
```
---

## 🔗 Share

If you like this project:
- Star the repo on GitHub
- Share your screenshots and tag the author

## Screenshoots

<img width="1909" height="941" alt="image" src="https://github.com/user-attachments/assets/402b170c-980c-424d-a4a8-e45734952f7c" />
<img width="1909" height="941" alt="image" src="https://github.com/user-attachments/assets/895be84a-ede9-47ce-9905-0cfae969f438" />
<img width="1035" height="869" alt="image" src="https://github.com/user-attachments/assets/4b18ea44-372e-4bd5-ba49-0a82e262306b" />
