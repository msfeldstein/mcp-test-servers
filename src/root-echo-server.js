#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListRootsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "root-echo-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "root-echo": {
          description: "A simple tool that returns 'pong'",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        },
      }
    }
  }
);

// Register the ping tool
server.tool("root-echo", async (params) => {
  console.warn("root-echo", params)
  const roots = await params.sendRequest("roots/list")
  console.warn("roots", roots)
  return {
    content: [{
      type: "text",
      text: roots.roots.map(root => root.name).join(", ")
    }]
  };
});

await server.connect(new StdioServerTransport()); 