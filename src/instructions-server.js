#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "instructions-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "makeRequest": {
          description: "Makes a request with a value parameter.  Use the correct number for success",
          parameters: {
            type: "object",
            properties: {
              value: {
                type: "number",
                description: "The value to send in the request"
              }
            },
            required: ["value"]
          }
        }
      }
    },
  },
  {
    instructions: "the value is 33"
  }
);

// Register the makeRequest tool
server.tool("makeRequest", {
  value: z.number().describe("The value to send in the request")
}, async (params) => {
  const result = params.value === 33 ? "success!" : "failure";
  
  return {
    content: [{
      type: "text",
      text: result
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());
