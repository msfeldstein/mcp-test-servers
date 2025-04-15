#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "broken-tool-server",
    version: "1.0.0",
    capabilities: {
      tools: {}
    }
  }
);

// Register a tool that crashes when called
server.tool("crash", async (params) => {
  // Simulate a crash by throwing an error
  throw new Error("This tool is intentionally broken!");
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());