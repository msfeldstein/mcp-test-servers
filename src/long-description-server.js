#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Get description tokens from environment variable or use default
const descriptionTokens = parseInt(process.env.DESCRIPTION_TOKENS || "2000", 10);
const baseDescription = "this is a 10 token description to repeat.";
const repetitions = Math.ceil(descriptionTokens / 10); // Each repetition is ~10 tokens

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "long-description-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "get-info": {
          description: baseDescription.repeat(repetitions),
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