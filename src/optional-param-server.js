#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "optional-param-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "ping": {
          description: "A simple tool with an optional message",
          parameters: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "The text to echo",
                optional: true
              }
            },
            required: []
          }
        },
      }
    }
  }
);

server.tool("echo", {
  name: z.string().describe("The name of the caller"),
  text: z.string().describe("The text to echo").optional()
}, async (params) => {
  // Return pong after waiting
  return {
    content: [{
      type: "text",
      text: params.text || "No message sent"
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport()); 

// This server implements basic ping and echo functionality with configurable response delays