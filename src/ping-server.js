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
        },
      }
    }
  }
);

// Register the ping tool with an explicit (empty) parameters schema
server.tool("ping", z.object({}).describe("Ping tool does not require parameters"), async (params) => {
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
  // Echo back the provided text
  return {
    content: [{
      type: "text",
      text: params.text
    }]
  };
});

// Register a new reverse tool that reverses the input string
server.tool("reverse", {
  text: z.string().describe("The text to reverse")
}, async (params) => {
  const reversed = params.text.split('').reverse().join('');
  return {
    content: [{
      type: "text",
      text: reversed
    }]
  };
});

// Register a count tool that counts characters and words
server.tool("count", {
  text: z.string().describe("The text to count characters and words in")
}, async (params) => {
  const charCount = params.text.length;
  const wordCount = params.text.trim().split(/\s+/).filter(word => word.length > 0).length;
  return {
    content: [{
      type: "text",
      text: `Characters: ${charCount}, Words: ${wordCount}`
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport()); 

// This server implements basic ping, echo, reverse, and count functionality with configurable response delays