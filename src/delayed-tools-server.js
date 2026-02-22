#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create a new MCP server with stdio transport and no initial tools
const server = new McpServer(
  {
    name: "delayed-tools-server",
    version: "1.0.0",
    capabilities: {
      tools: {}
    }
  }
);

// Register the tool but keep it disabled initially
const delayedTool = server.tool(
  "delayedPing",
  z.object({}).describe("No parameters"),
  async () => {
    return {
      content: [{
        type: "text",
        text: "pong"
      }]
    };
  }
);
delayedTool.disable();

const enableDelayMs = 1000;

// Enable the tool after the configured delay
setTimeout(() => {
  delayedTool.enable();
}, enableDelayMs);

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());

// This server starts with zero tools and enables one after a delay
