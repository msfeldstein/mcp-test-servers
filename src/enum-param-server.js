#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create a new MCP server with stdio transport and an enum type parameter
const server = new McpServer(
  {
    name: "enum-param-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "choose-color": {
          description: "A tool that returns the selected color",
          parameters: {
            type: "object",
            properties: {
              color: {
                type: "string",
                enum: ["red", "green", "blue"],
                description: "The color to choose"
              }
            },
            required: ["color"]
          }
        }
      }
    }
  }
);

// Register the choose-color tool with a zod enum schema
server.tool(
  "choose-color",
  {
    color: z.enum(["red", "green", "blue"]).describe("The color to choose")
  },
  async (params) => {
    return {
      content: [
        {
          type: "text",
          text: `You chose the color ${params.color}`
        }
      ]
    };
  }
);

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());

// This server demonstrates a tool with an enum type parameter 