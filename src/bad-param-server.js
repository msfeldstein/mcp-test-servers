#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// Create a new MCP server with stdio transport
const server = new McpServer({
  name: "bad-param-server",
  version: "1.0.0",
  capabilities: {
    tools: {
      "bad-param": {
        description: "A simple tool that returns 'pong'",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    },
  },
});

// Register the ping tool
server.tool(
  "bad-param",
  {
    ["bad%%^Param"]: z
      .string()
      .describe("The bad param name"),
  },
  async (params) => {
    return {
      content: [
        {
          type: "text",
          text: "pong",
        },
      ],
    };
  }
);

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());

// This server implements basic ping and echo functionality with configurable response delays
