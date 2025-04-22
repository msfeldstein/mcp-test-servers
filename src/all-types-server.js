#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Define the schema for the nested object parameter
const nestedObjectSchema = z.object({
  nestedString: z.string().describe("A nested string property"),
  nestedNumber: z.number().describe("A nested number property"),
  nestedBoolean: z.boolean().describe("A nested boolean property"),
});

// Define the schema for the tool parameters using Zod
const allTypesParamsSchema = z.object({
  requiredString: z.string().describe("A required string parameter"),
  requiredInteger: z.number().int().describe("A required integer parameter"),
  requiredNumber: z.number().describe("A required number (float/decimal) parameter"),
  requiredBoolean: z.boolean().describe("A required boolean parameter"),
  requiredStringArray: z.array(z.string()).describe("A required array of strings"),
  requiredNumberArray: z.array(z.number()).describe("A required array of numbers"),
  requiredObject: nestedObjectSchema.describe("A required object with nested properties"),
  requiredEnum: z.enum(["option1", "option2", "option3"]).describe("A required enum parameter"),
  optionalString: z.string().optional().describe("An optional string parameter"),
  optionalNumber: z.number().optional().describe("An optional number parameter"),
});

// Create a new MCP server instance
const server = new McpServer(
  {
    name: "all-types-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "all_types_tool": {
          description: "A tool demonstrating various supported parameter types",
          parameters: allTypesParamsSchema, // Use Zod schema directly for capabilities
        },
      },
    },
  }
);

// Register the tool with the defined Zod schema
server.tool(
  "all_types_tool",
  allTypesParamsSchema,
  async (params) => {
    // Simply return the received parameters to demonstrate they were parsed correctly
    return {
      content: [
        {
          type: "text",
          text: `Received parameters: ${JSON.stringify(params, null, 2)}`,
        },
      ],
    };
  }
);

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());
