#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Get the server name from environment variable, default to 'unnamed-server' if not set
const serverName = process.env.MCP_SERVER_NAME || 'unnamed-server';

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: serverName,
    version: "1.0.0",
    capabilities: {
      tools: {}
    }
  }
);

// Register a tool that returns the server's name, using the server name in the tool name
server.tool(serverName, async () => {
  return {
    content: [{
      type: "text",
      text: `This server's name is: ${serverName}`
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport()); 