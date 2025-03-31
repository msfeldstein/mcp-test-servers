#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "many-tools-server",
    version: "1.0.0",
    capabilities: {
      tools: Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [
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

// Register all 100 tools
for (let i = 1; i <= 100; i++) {
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