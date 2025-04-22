#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Get description tokens from environment variable or use default
const descriptionTokens = process.env.DESCRIPTION_TOKENS;
const descriptionChars = process.env.DESCRIPTION_CHARS;

const baseDescription = "this is a 10 token description to repeat. ";

let description;
if (descriptionTokens) {
  description = baseDescription.repeat(Math.ceil(parseInt(descriptionTokens, 10) / 10));
} else {
  const numChars = parseInt(descriptionChars ?? "2000", 10);
  description = baseDescription.repeat(Math.ceil(numChars / baseDescription.length) + 1).slice(0, numChars);
}

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "long-description-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "get-info": {
          description,
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
server.tool("get-info", description, async (params) => {
  return {
    content: [{
      type: "text",
      text: "Server information retrieved successfully"
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport()); 