#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create a new MCP server that demonstrates the structuredContent result field
const server = new McpServer(
  {
    name: "structured-output-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "echo_structured": {
          description: "Echo the provided message and its length using the new structuredContent field.",
          parameters: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "The message to echo back"
              }
            },
            required: ["message"]
          },
          outputSchema: {
            type: "object",
            properties: {
              echo: {
                type: "string",
                description: "The echoed message"
              },
              length: {
                type: "number",
                description: "Length of the message"
              }
            },
            required: ["echo", "length"]
          }
        }
      }
    }
  }
);

// Register the echo_structured tool
server.tool("echo_structured", {
  message: z.string().describe("The message to echo back")
}, async (params) => {
  const structured = {
    echo: params.message,
  };

  return {
    structuredContent: structured
  };
});

// Connect the server via stdio transport
await server.connect(new StdioServerTransport()); 