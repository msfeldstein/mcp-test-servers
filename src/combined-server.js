#!/usr/bin/env node

/**
 * @fileoverview A combined MCP server implementation that provides a ping tool and a hello world resource.
 * This server demonstrates multiple capabilities including tools and resources in a single MCP server.
 * Updated with enhanced functionality and better documentation.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

/**
 * @type {McpServer}
 * @description Creates a new MCP server instance with basic capabilities
 */
const server = new McpServer(
  {
    name: "combined-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        fizzbuzz: {
          description: "Generates a FIZZY sequence up to the specified number",
          parameters: {
            type: "object",
            properties: {
                  limit: {
                    type: "number",
                    description: "The upper limit for the FIZZY sequence"
              }
            },
            required: ["limit"]
          }
        }
      }
    }
  }
);

/**
 * @function
 * @name ping
 * @description A simple ping tool that responds with "pong"
 * @param {Object} params - The parameters passed to the tool (unused)
 * @returns {Promise<Object>} A promise that resolves to an object containing the response
 */
server.tool("ping", async (params) => {
  return {
    content: [{
      type: "text",
      text: "pong"
    }]
  };
});

/**
 * @function
 * @name fizzbuzz
 * @description Generates a FizzBuzz sequence up to the specified number
 * @param {Object} params - The parameters containing the upper limit
 * @returns {Promise<Object>} A promise that resolves to an object containing the FizzBuzz sequence
 */
server.tool("fizzbuzz", async (params) => {
  const limit = params.limit;
  if (limit < 1 || limit > 1000) {
    return {
      content: [{
        type: "text",
        text: "Error: Limit must be between 1 and 1000"
      }]
    };
  }
  
  const result = [];
  for (let i = 1; i <= limit; i++) {
    let output = "";
    if (i % 3 === 0) output += "Fizz";
    if (i % 5 === 0) output += "Buzz";
    result.push(output || i.toString());
  }

  return {
    content: [{
      type: "text",
      text: result.join("\n")
    }]
  };
});

/**
 * @function
 * @name sum
 * @description Calculates the sum of an array of numbers
 * @param {Object} params - The parameters containing the numbers array
 * @returns {Promise<Object>} A promise that resolves to an object containing the sum
 */
server.tool("sum", {
  numbers: z.array(z.number()).describe("Array of numbers to sum")
}, async (params) => {
  const sum = params.numbers.reduce((acc, num) => acc + num, 0);
  return {
    content: [{
      type: "text",
      text: `Sum: ${sum}`
    }]
  };
});

/**
 * @description Registers a simple "Hello World" resource with the server
 * @type {Resource}
 */
server.resource(
  "Hello World Text",
  "test://hello.txt",
  {
    description: "A simple test file containing 'Hello, world'",
    mimeType: "text/plain"
  },
  async () => ({
    contents: [
      {
        uri: "test://hello.txt",
        mimeType: "text/plain",
        text: "Hello, world"
      }
    ]
  })
);

await server.connect(new StdioServerTransport()); 