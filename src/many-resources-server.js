#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "many-resources-server",
    version: "1.0.0"
  }
);

server.tool(
  "many-resources-tool",
  "Many Resources Tool",
  "This tool returns many resources",
  async () => ({
    resources: []
  })
);

// Generate 200 resources
for (let i = 1; i <= 600; i++) {
  server.resource(
    `Resource ${i}`,
    `test://resource${i}.txt`,
    {
      description: `Resource number ${i} of 200`,
      mimeType: "text/plain"
    },
    async () => ({
      contents: [
        {
          uri: `test://resource${i}.txt`,
          mimeType: "text/plain",
          text: `This is the content of resource ${i} of 200. Each resource has unique content.`
        }
      ]
    })
  );
}

// Connect to the transport and start the server
await server.connect(new StdioServerTransport()); 