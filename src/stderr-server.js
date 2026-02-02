#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "stderr-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "ping": {
          description: "A server that logs to stderr",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        },
      }
    }
  }
);

// Register the ping tool
server.tool("log-to-stderr", async (params) => {
  console.error("This is logging to stderr");
  return {
    content: [{
      type: "text",
      text: "Should have logged to stderr"
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport()); 

// This server demonstrates logging to stderr for debugging purposes