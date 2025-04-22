#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "number-param-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "number-param": {
          description: "A tool that accepts a number parameter and returns its square",
          parameters: {
            type: "object",
            properties: {
              number: {
                type: "number",
                description: "The number to process"
              }
            },
            required: ["number"]
          }
        }
      }
    }
  }
);

// Register the number-param tool
server.tool("number-param", {
  number: z.number().describe("The number to process")
}, async (params) => {
  const result = params.number * params.number;
  return {
    content: [{
      type: "text",
      text: `The square of ${params.number} is ${result}`
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport()); 