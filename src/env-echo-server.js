#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "env-echo-server",
    version: "1.1.0",
    capabilities: {
      tools: {}
    }
  }
);

// Register a tool that returns all environment variables
server.tool("env_echo", async (params) => {
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

// Register a tool that returns a specific environment variable
server.tool("get_env_var", {
  varName: z.string().describe("The name of the environment variable to retrieve")
}, async (params) => {
  const value = process.env[params.varName];
  if (value === undefined) {
    return {
      content: [{
        type: "text",
        text: `Environment variable '${params.varName}' is not set.`
      }]
    };
  }
  return {
    content: [{
      type: "text",
      text: `${params.varName}=${value}`
    }]
  };
});

// Register a tool that lists all environment variable names
server.tool("list_env_vars", "List all environment variable names", async (params) => {
  const varNames = Object.keys(process.env).sort();
  return {
    content: [{
      type: "text",
      text: `Available environment variables (${varNames.length} total):\n${varNames.join('\n')}`
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport()); 