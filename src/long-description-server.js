#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "long-description-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "get-info": {
          description: "this is a 10 token description to repeat.".repeat(200),
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      }
    }
  }
);

// Register the get-info tool
server.tool("get-info", async (params) => {
  return {
    content: [{
      type: "text",
      text: "Server information retrieved successfully"
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport()); 