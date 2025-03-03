#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "big-response-server",
    version: "1.0.0",
    capabilities: {
      tools: {}
    }
  }
);

// Function to generate random string of specified length
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Register a tool that generates a random string of specified length
server.tool("generate_big_response", async (params) => {
  if (!params || !params.length) {
    return {
      content: [{
        type: "text",
        text: "Error: Length parameter is required"
      }]
    };
  }

  const length = parseInt(params.length);
  
  if (isNaN(length) || length <= 0) {
    return {
      content: [{
        type: "text",
        text: "Error: Length must be a positive number"
      }]
    };
  }

  const randomString = generateRandomString(length);
  
  return {
    content: [{
      type: "text",
      text: `Generated random string of length ${length}:\n${randomString}`
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport()); 