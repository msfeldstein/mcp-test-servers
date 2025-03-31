#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "ping-server",
    version: "1.0.0",
    capabilities: {
      tools: {
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

// Register the ping tool
server.tool("ping", async (params) => {
  return {
    content: [{
      type: "text",
      text: "pong"
    }]
  };
});

// Register the long-running-ping tool
server.tool("long-running-ping", {
  waitTimeMs: z.number().optional().default(3000).describe("The time to wait in milliseconds before returning the response")
}, async (params) => {
  // Get the wait duration in milliseconds (default to 3000ms if not provided)
  const waitTime = params?.waitTimeMs || 3000;
  
  // Create a promise that resolves after the specified time
  await new Promise(resolve => setTimeout(resolve, waitTime));
  
  // Return pong after waiting
  return {
    content: [{
      type: "text",
      text: "pong"
    }]
  };
});

server.tool("echo", {
  text: z.string().describe("The text to echo")
}, async (params) => {
  // Return pong after waiting
  return {
    content: [{
      type: "text",
      text: params.text
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport()); 

// This server implements basic ping and echo functionality with configurable response delays