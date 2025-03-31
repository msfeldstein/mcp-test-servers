#!/usr/bin/env node

/**
 * @fileoverview A combined MCP server implementation that provides a ping tool and a hello world resource.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

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