#!/usr/bin/env python3
"""
Kali Linux MCP Agent - WebSocket Client
Hubungkan mesin Kali Linux Anda ke MCP Agent web interface

Installation:
  pip install websocket-client

Usage:
  python3 kali-client.py --token YOUR_TOKEN_HERE --server wss://your-server.replit.app

Get your token from the web interface Settings page.
"""

import subprocess
import json
import argparse
import platform
import socket
import sys
import time
import websocket
import threading

class KaliClient:
    def __init__(self, server_url, token):
        self.server_url = server_url
        self.token = token
        self.ws = None
        self.connected = False
        self.hostname = socket.gethostname()
        self.os_info = f"{platform.system()} {platform.release()}"
        
    def on_message(self, ws, message):
        try:
            data = json.loads(message)
            msg_type = data.get("type")
            
            if msg_type == "auth_success":
                client_id = data.get('clientId')
                print(f"✓ Authenticated successfully as client: {client_id}")
                self.connected = True
                print("✓ Heartbeat started - sending pings every 30 seconds")
                
            elif msg_type == "auth_failed":
                print(f"✗ Authentication failed: {data.get('error')}")
                self.connected = False
                ws.close()
                
            elif msg_type == "execute":
                command_id = data.get("commandId")
                command = data.get("command")
                print(f"\n→ Executing command: {command}")
                self.execute_command(command_id, command)
                
            elif msg_type == "pong":
                pass  # Heartbeat response
                
        except Exception as e:
            print(f"Error processing message: {e}")
    
    def on_error(self, ws, error):
        print(f"WebSocket error: {error}")
    
    def on_close(self, ws, close_status_code, close_msg):
        print(f"\n✗ Disconnected from server")
        self.connected = False
    
    def on_open(self, ws):
        self.ws = ws  # Store WebSocket instance
        print("✓ Connected to MCP Agent server")
        # Send authentication
        auth_message = {
            "type": "auth",
            "token": self.token,
            "hostname": self.hostname,
            "os": self.os_info
        }
        self.ws.send(json.dumps(auth_message))
        
        # Start heartbeat - runs continuously while WS is open
        def heartbeat():
            while True:
                time.sleep(30)
                try:
                    # Only send pings after authentication
                    if self.connected and self.ws and self.ws.sock and self.ws.sock.connected:
                        self.ws.send(json.dumps({"type": "ping"}))
                    elif not self.ws or not self.ws.sock or not self.ws.sock.connected:
                        # Socket closed, exit heartbeat
                        break
                except Exception as e:
                    print(f"Heartbeat error: {e}")
                    break
        
        threading.Thread(target=heartbeat, daemon=True).start()
    
    def execute_command(self, command_id, command):
        """Execute command on Kali Linux and send results back"""
        try:
            # Execute command with timeout (5 minutes for intensive security scans)
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            output = result.stdout or result.stderr or "Command executed with no output"
            exit_code = result.returncode
            
            # Send result back to server
            response = {
                "type": "result",
                "commandId": command_id,
                "output": output.strip(),
                "exitCode": exit_code
            }
            
            self.ws.send(json.dumps(response))
            
            status = "✓" if exit_code == 0 else "✗"
            print(f"{status} Command finished (exit code: {exit_code})")
            
        except subprocess.TimeoutExpired:
            response = {
                "type": "result",
                "commandId": command_id,
                "output": "Command execution timeout (300 seconds / 5 minutes)",
                "exitCode": 124
            }
            self.ws.send(json.dumps(response))
            print("✗ Command timeout (5 minutes exceeded)")
            
        except Exception as e:
            response = {
                "type": "result",
                "commandId": command_id,
                "output": f"Error executing command: {str(e)}",
                "exitCode": 1
            }
            self.ws.send(json.dumps(response))
            print(f"✗ Execution error: {e}")
    
    def connect(self):
        """Connect to the MCP Agent server"""
        print(f"\n🔗 Kali Linux MCP Agent Client")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"Hostname: {self.hostname}")
        print(f"OS: {self.os_info}")
        print(f"Server: {self.server_url}")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
        
        # WebSocket connection
        self.ws = websocket.WebSocketApp(
            self.server_url,
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close
        )
        
        # Run forever with auto-reconnect
        while True:
            try:
                self.ws.run_forever()
                print("\n⟳ Reconnecting in 5 seconds...")
                time.sleep(5)
            except KeyboardInterrupt:
                print("\n\n👋 Shutting down client...")
                break
            except Exception as e:
                print(f"\n✗ Connection error: {e}")
                print("⟳ Retrying in 5 seconds...")
                time.sleep(5)

def main():
    parser = argparse.ArgumentParser(
        description='Kali Linux MCP Agent WebSocket Client',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Connect to MCP Agent server
  python3 kali-client.py --token abc123xyz --server wss://your-app.replit.app

  # Get token from web interface Settings page
  python3 kali-client.py --token YOUR_TOKEN --server wss://your-server.com

Note: Make sure websocket-client is installed:
  pip install websocket-client
        """
    )
    
    parser.add_argument(
        '--token',
        required=True,
        help='Authentication token from MCP Agent web interface'
    )
    
    parser.add_argument(
        '--server',
        required=True,
        help='WebSocket server URL (e.g., wss://your-app.replit.app)'
    )
    
    args = parser.parse_args()
    
    # Ensure server URL uses correct WebSocket path
    server_url = args.server.rstrip('/')
    if not server_url.endswith('/kali-ws'):
        server_url += '/kali-ws'
    
    client = KaliClient(server_url, args.token)
    client.connect()

if __name__ == "__main__":
    main()
