#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// server is an MCP server that can generate a random string of a specified length
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
              stringLength: {
                type: "integer",
                description: "The length of the random string to generate"
              }
            },
            required: ['stringLength']
          }
        }
      }
    }
  }
);

// generateRandomString is a helper function that generates a random string of a specified length
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// register the generate_big_response tool 
server.tool("generate_big_response", {
  stringLength: z.number().int().positive().describe("The length of the random string to generate")
}, async (params) => {
  const randomString = generateRandomString(params.stringLength);
  
  return {
    content: [{
      type: "text",
      text: `Generated random string of length ${params.stringLength}:\n${randomString}`
    }]
  };
});

await server.connect(new StdioServerTransport()); 