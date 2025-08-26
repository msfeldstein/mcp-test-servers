#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Get tool count from environment variable or default to 100
const TOOL_COUNT = parseInt(process.env.TOOL_COUNT || '100', 10);

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "many-tools-server",
    version: "1.0.0",
    capabilities: {
      tools: Object.fromEntries(
        Array.from({ length: TOOL_COUNT }, (_, i) => [
          `tool_${i + 1}`,
          {
            description: `Tool ${i + 1} that returns 'ack'`,
            parameters: {
              type: "object",
              properties: {},
              required: []
            }
          }
        ])
      )
    }
  }
);

// Register all tools
for (let i = 1; i <= TOOL_COUNT; i++) {
  server.tool(`tool_${i}`, async () => {
    return {
      content: [{
        type: "text",
        text: "ack"
      }]
    };
  });
}

// Connect to the transport and start the server
await server.connect(new StdioServerTransport()); 