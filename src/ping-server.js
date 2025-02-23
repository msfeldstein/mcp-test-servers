#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "ping-server",
    version: "1.0.0",
    capabilities: {
      tools: {}
    }
  }
);

// Register the ping tool
server.tool("ping", async (params) => {
  return {
    content: [{
      type: "text",
      text: "pong"
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport()); 