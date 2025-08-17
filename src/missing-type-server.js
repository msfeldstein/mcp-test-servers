#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create a new MCP server that reproduces the missing tools[0].type error
// We'll manually construct the server capabilities to omit the type field
const server = new McpServer(
  {
    name: "missing-type-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "missing-type-tool": {
          description: "A tool that's missing the type field",
          parameters: {
            // Note: We're intentionally omitting the "type": "object" field here
            // which should cause the missing tools[0].type error
            properties: {
              input_text: {
                description: "Some input text"
              }
            },
            required: ["input_text"]
          }
        },
        "another-missing-type": {
          description: "Another tool missing type field",
          parameters: {
            // Also missing "type": "object"
            properties: {
              number_input: {
                type: "number",
                description: "A number input"
              },
              optional_flag: {
                type: "boolean",
                description: "An optional flag"
              }
            },
            required: ["number_input"]
          }
        }
      }
    }
  }
);

// Register the tools with missing type
server.tool("missing-type-tool", "A tool with missing type field", async (params) => {
  return {
    content: [{
      type: "text",
      text: `Received input: ${params.input_text}`
    }]
  };
});

server.tool("another-missing-type", "Another tool with missing type field", async (params) => {
  return {
    content: [{
      type: "text",
      text: `Received number: ${params.number_input}, flag: ${params.optional_flag || 'not provided'}`
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());

// This server reproduces the missing tools[0].type error by omitting the type field in parameter schemas
