#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "long-running-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "long-running-task": {
          description: "A long-running task that sends progress notifications every 2 seconds",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      }
    }
  }
);

// Register the long-running-task tool
server.tool("long-running-task", async (extra, other, ...args) => {
    console.warn("EXTRAS", extra, other, args)
  const { sendNotification } = extra;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Check if the client provided a progress token
  const progressToken = extra.sessionId?._meta?.progressToken;
  
  // Send progress notifications every 2 seconds, adding 10% each time
  for (let progress = 10; progress <= 100; progress += 10) {
    await sleep(2000); // Wait 2 seconds
    
    // Only send progress notifications if we have a progress token
    if (progressToken) {
      await sendNotification({
        method: "notifications/progress",
        params: {
          progressToken: progressToken,
          progress: progress,
          total: 100,
          message: `Processing... ${progress}% complete`
        }
      });
    }
  }
  
  // Return "done" when complete
  return {
    content: [{
      type: "text",
      text: "done"
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());

// This server implements a long-running task with progress notifications 