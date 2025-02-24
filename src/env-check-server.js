#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Check environment variable before proceeding
if (process.env.SHOULD_RUN !== "true") {
  throw new Error("SHOULD_RUN environment variable must be set to 'true' to start this server");
}

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "env-check-server",
    version: "1.0.0",
    capabilities: {
      tools: {}
    }
  }
);

// Register a simple tool to show the server is running
server.tool("status", async (params) => {
  return {
    content: [{
      type: "text",
      text: "Server is running with SHOULD_RUN=true"
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport()); 