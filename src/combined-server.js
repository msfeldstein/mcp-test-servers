#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "combined-server",
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

// Register our test resource
server.resource(
  "Hello World Text",
  "test://hello.txt",
  {
    description: "A simple test file containing 'Hello, world'",
    mimeType: "text/plain"
  },
  async () => ({
    contents: [
      {
        uri: "test://hello.txt",
        mimeType: "text/plain",
        text: "Hello, world"
      }
    ]
  })
);

// Connect to the transport and start the server
await server.connect(new StdioServerTransport()); 