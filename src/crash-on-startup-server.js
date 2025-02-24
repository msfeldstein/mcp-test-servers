#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Immediately throw an error during module initialization
throw new Error("Server crashed during startup!");

// The code below will never be reached
const server = new McpServer(
  {
    name: "crash-on-startup-server",
    version: "1.0.0",
    capabilities: {
      tools: {}
    }
  }
);

await server.connect(new StdioServerTransport()); 