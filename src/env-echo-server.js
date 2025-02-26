#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "env-echo-server",
    version: "1.0.0",
    capabilities: {
      tools: {}
    }
  }
);

// Register a tool that returns all environment variables
server.tool("echo_env", async (params) => {
  // Convert process.env object to a formatted string
  const envString = Object.entries(process.env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  return {
    content: [{
      type: "text",
      text: `Current environment variables:\n${envString}`
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport()); 