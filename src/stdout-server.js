#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// THIS IS THE INTENTIONAL BAD LINE
console.log("Stdout server started - this should break the protocol!");

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "stdout-server", // Changed server name
    version: "1.0.0",
    capabilities: {
      tools: {
        // Keeping a simple tool for completeness, though it might not be reachable
        "ping": { 
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

// Register the ping tool (might not be reachable due to stdout write)
server.tool("ping", async (params) => {
  return {
    content: [{
      type: "text",
      text: "pong"
    }]
  };
});


// Connect to the transport and start the server
// This part might fail or hang because of the stdout write
await server.connect(new StdioServerTransport()); 

// This server intentionally writes to stdout on startup, which violates MCP protocol rules. 