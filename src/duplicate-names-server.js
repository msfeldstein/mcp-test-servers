#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "duplicate-names-server",
    version: "1.0.0"
  }
);

// Create sets of resources with duplicate names
const duplicateNames = [
  "Common Resource",
  "Duplicate File",
  "Same Name Different Content"
];

duplicateNames.forEach((name, nameIndex) => {
  // Create 3 resources for each name
  for (let i = 1; i <= 3; i++) {
    server.resource(
      name,
      `test://duplicate${nameIndex + 1}_${i}.txt`,
      {
        description: `Resource ${i} of 3 with name "${name}"`,
        mimeType: "text/plain"
      },
      async () => ({
        contents: [
          {
            uri: `test://duplicate${nameIndex + 1}_${i}.txt`,
            mimeType: "text/plain",
            text: `This is version ${i} of the resource named "${name}". Each resource shares the same name but has unique content and URI.`
          }
        ]
      })
    );
  }
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport()); 