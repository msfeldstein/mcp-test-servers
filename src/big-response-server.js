#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "big-response-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "generate_big_response": {
          description: "Generates a random string of specified length",
          parameters: {
            type: "object",
            properties: {
              length: {
                type: "integer",
                description: "The length of the random string to generate"
              }
            },
            required: ['length']
          }
        }
      }
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
server.tool("generate_big_response", {
  length: z.number().int().positive().describe("The length of the random string to generate")
}, async (params) => {
  const randomString = generateRandomString(params.length);
  
  return {
    content: [{
      type: "text",
      text: `Generated random string of length ${params.length}:\n${randomString}`
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport()); 