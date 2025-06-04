#!/usr/bin/env node

// Import required dependencies from the MCP SDK and Zod for schema validation
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Define a nested object schema that will be used as part of the main parameters
// This demonstrates how to handle complex nested data structures
const nestedObjectSchema = z.object({
  nestedString: z.string().describe("A nested string property"),
  nestedNumber: z.number().describe("A nested number property"),
  nestedBoolean: z.boolean().describe("A nested boolean property"),
});

// Define the main parameter schema using Zod
// This schema demonstrates all the supported parameter types in MCP:
// - Basic types (string, number, boolean)
// - Arrays
// - Nested objects
// - Enums
// - Optional parameters
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

// Initialize the MCP server with metadata and tool capabilities
// The server is configured to expose a single tool that demonstrates all parameter types
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

// Register the tool implementation
// This handler simply echoes back the received parameters to demonstrate
// that they were correctly parsed according to the schema
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

// Start the server using stdio transport
// This allows the server to communicate with clients through standard input/output
await server.connect(new StdioServerTransport());
