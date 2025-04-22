#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create a new MCP server with stdio transport and a tool for searching Stripe documentation
const server = new McpServer(
  {
    name: "enum-param-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "search_documentation": {
          description: "Search the Stripe documentation for the given question and language.\n\n    It takes two arguments:\n      ...",
          parameters: {
            type: "object",
            properties: {
              question: {
                type: "string",
                description: "The user question about integrating with Stripe will be used to search the documentation."
              },
              language: {
                type: "string",
                enum: ["dotnet", "go", "java", "node", "php", "ruby", "python", "curl"],
                description: "The programming language to search for in the the documentation."
              }
            },
            required: ["question"]
          }
        }
      }
    }
  }
);

// Register the search_documentation tool with a zod enum schema
server.tool(
  "search_documentation",
  {
    question: z.string().describe("The user question about integrating with Stripe will be used to search the documentation."),
    language: z.enum(["dotnet", "go", "java", "node", "php", "ruby", "python", "curl"]).describe("The programming language to search for in the the documentation.")
  },
  async (params) => {
    return {
      content: [
        {
          type: "text",
          text: `Question: ${params.question}` + (params.language ? `, Language: ${params.language}` : "")
        }
      ]
    };
  }
);

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());

// This server demonstrates a search_documentation tool with enum type parameter. 