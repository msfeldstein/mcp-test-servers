#!/usr/bin/env python3

import json
import sys
import asyncio
from typing import Any, Dict

class RawBrokenMCPServer:
    """Raw MCP server that sends genuinely broken tool schemas"""
    
    def __init__(self):
        self.request_id = 0
    
    def send_message(self, message: Dict[str, Any]):
        """Send a JSON-RPC message to stdout"""
        json_str = json.dumps(message)
        sys.stdout.write(json_str + '\n')
        sys.stdout.flush()
    
    def send_error(self, request_id: int, code: int, message: str):
        """Send an error response"""
        self.send_message({
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": code,
                "message": message
            }
        })
    
    def handle_initialize(self, request_id: int, params: Dict):
        """Handle initialize request"""
        self.send_message({
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "Raw Broken MCP Server",
                    "version": "1.0.0"
                }
            }
        })
    
    def handle_tools_list(self, request_id: int, params: Dict):
        """Handle tools/list request - return genuinely broken schemas"""
        # This is where we send the truly broken schemas
        broken_tools = [
            {
                "name": "missing_type_tool",
                "description": "Tool missing type field",
                "inputSchema": {
                    # Intentionally missing "type": "object"
                    "properties": {
                        "input_text": {
                            "description": "Some input text"
                        }
                    },
                    "required": ["input_text"]
                }
            },
            {
                "name": "broken_oneof_tool", 
                "description": "Tool with oneOf at top level",
                "inputSchema": {
                    # oneOf at top level - should cause error
                    "oneOf": [
                        {
                            "type": "object",
                            "properties": {
                                "option_a": {"type": "string"}
                            }
                        },
                        {
                            "type": "object", 
                            "properties": {
                                "option_b": {"type": "number"}
                            }
                        }
                    ]
                }
            },
            {
                "name": "broken_allof_tool",
                "description": "Tool with allOf at top level", 
                "inputSchema": {
                    # allOf at top level - should cause error
                    "allOf": [
                        {
                            "type": "object",
                            "properties": {
                                "base_prop": {"type": "string"}
                            }
                        },
                        {
                            "properties": {
                                "extra_prop": {"type": "string"}
                            }
                        }
                    ]
                }
            },
            {
                "name": "completely_broken_tool",
                "description": "Tool with no inputSchema at all"
                # Intentionally missing inputSchema entirely
            },
            {
                "name": "invalid_json_schema_tool",
                "description": "Tool with completely invalid schema",
                "inputSchema": {
                    # Invalid schema structure
                    "invalid_field": "this should not be here",
                    "properties": {
                        "test": "not a valid property definition"
                    }
                }
            }
        ]
        
        self.send_message({
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "tools": broken_tools
            }
        })
    
    def handle_tools_call(self, request_id: int, params: Dict):
        """Handle tools/call request"""
        tool_name = params.get("name", "unknown")
        arguments = params.get("arguments", {})
        
        self.send_message({
            "jsonrpc": "2.0", 
            "id": request_id,
            "result": {
                "content": [
                    {
                        "type": "text",
                        "text": f"Called {tool_name} with args: {arguments}"
                    }
                ]
            }
        })
    
    def handle_request(self, request: Dict):
        """Handle incoming JSON-RPC request"""
        method = request.get("method")
        request_id = request.get("id")
        params = request.get("params", {})
        
        if method == "initialize":
            self.handle_initialize(request_id, params)
        elif method == "tools/list":
            self.handle_tools_list(request_id, params)
        elif method == "tools/call":
            self.handle_tools_call(request_id, params)
        else:
            self.send_error(request_id, -32601, f"Method not found: {method}")
    
    async def run(self):
        """Main server loop"""
        # Send initial server info
        self.send_message({
            "jsonrpc": "2.0",
            "method": "notifications/initialized",
            "params": {}
        })
        
        # Read from stdin and process requests
        loop = asyncio.get_event_loop()
        
        while True:
            try:
                # Read line from stdin
                line = await loop.run_in_executor(None, sys.stdin.readline)
                if not line:
                    break
                
                line = line.strip()
                if not line:
                    continue
                
                # Parse JSON-RPC request
                try:
                    request = json.loads(line)
                    self.handle_request(request)
                except json.JSONDecodeError as e:
                    # Send parse error
                    self.send_error(None, -32700, f"Parse error: {str(e)}")
                    
            except EOFError:
                break
            except Exception as e:
                # Send internal error
                self.send_error(None, -32603, f"Internal error: {str(e)}")

if __name__ == "__main__":
    server = RawBrokenMCPServer()
    asyncio.run(server.run())


