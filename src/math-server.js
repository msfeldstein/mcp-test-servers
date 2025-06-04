#!/usr/bin/env node

// Import required dependencies from the MCP SDK and zod validation library
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

/**
 * Math Server
 * This server implements basic mathematical operations as MCP tools.
 * It uses stdio for communication and provides functions like:
 * - Basic arithmetic (add, subtract, multiply, divide)
 * - Advanced operations (power, square root, factorial)
 */

// Initialize the MCP server with configuration and tool definitions
const server = new McpServer(
  {
    name: "math-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "add": {
          description: "Add two numbers",
          parameters: {
            type: "object",
            properties: {
              a: { type: "number", description: "First number" },
              b: { type: "number", description: "Second number" }
            },
            required: ["a", "b"]
          }
        },
        "subtract": {
          description: "Subtract b from a",
          parameters: {
            type: "object",
            properties: {
              a: { type: "number", description: "Number to subtract from" },
              b: { type: "number", description: "Number to subtract" }
            },
            required: ["a", "b"]
          }
        },
        "multiply": {
          description: "Multiply two numbers",
          parameters: {
            type: "object",
            properties: {
              a: { type: "number", description: "First number" },
              b: { type: "number", description: "Second number" }
            },
            required: ["a", "b"]
          }
        },
        "divide": {
          description: "Divide a by b",
          parameters: {
            type: "object",
            properties: {
              a: { type: "number", description: "Dividend" },
              b: { type: "number", description: "Divisor (cannot be zero)" }
            },
            required: ["a", "b"]
          }
        },
        "power": {
          description: "Calculate a raised to the power of b",
          parameters: {
            type: "object",
            properties: {
              a: { type: "number", description: "Base number" },
              b: { type: "number", description: "Exponent" }
            },
            required: ["a", "b"]
          }
        },
        "sqrt": {
          description: "Calculate the square root of a number",
          parameters: {
            type: "object",
            properties: {
              n: { type: "number", description: "Number to find square root of (must be non-negative)" }
            },
            required: ["n"]
          }
        },
        "factorial": {
          description: "Calculate the factorial of a non-negative integer",
          parameters: {
            type: "object",
            properties: {
              n: { type: "number", description: "Non-negative integer to calculate factorial of" }
            },
            required: ["n"]
          }
        }
      }
    }
  }
);

// Tool Implementations
// Each tool follows the pattern of:
// 1. Parameter validation using zod
// 2. Computation of the mathematical operation
// 3. Returning formatted results

// Addition: Adds two numbers and returns the result
server.tool("add", {
  a: z.number().describe("First number"),
  b: z.number().describe("Second number")
}, async (params) => {
  const result = params.a + params.b;
  return {
    content: [{
      type: "text",
      text: `${params.a} + ${params.b} = ${result}`
    }]
  };
});

// Subtraction: Subtracts the second number from the first
server.tool("subtract", {
  a: z.number().describe("Number to subtract from"),
  b: z.number().describe("Number to subtract")
}, async (params) => {
  const result = params.a - params.b;
  return {
    content: [{
      type: "text",
      text: `${params.a} - ${params.b} = ${result}`
    }]
  };
});

// Multiplication: Multiplies two numbers together
server.tool("multiply", {
  a: z.number().describe("First number"),
  b: z.number().describe("Second number")
}, async (params) => {
  const result = params.a * params.b;
  return {
    content: [{
      type: "text",
      text: `${params.a} × ${params.b} = ${result}`
    }]
  };
});

// Division: Divides first number by second, includes zero check
server.tool("divide", {
  a: z.number().describe("Dividend"),
  b: z.number().describe("Divisor (cannot be zero)")
}, async (params) => {
  if (params.b === 0) {
    return {
      content: [{
        type: "text",
        text: "Error: Division by zero is not allowed"
      }]
    };
  }
  const result = params.a / params.b;
  return {
    content: [{
      type: "text",
      text: `${params.a} ÷ ${params.b} = ${result}`
    }]
  };
});

// Power: Calculates exponentiation (a raised to power b)
server.tool("power", {
  a: z.number().describe("Base number"),
  b: z.number().describe("Exponent")
}, async (params) => {
  const result = Math.pow(params.a, params.b);
  return {
    content: [{
      type: "text",
      text: `${params.a}^${params.b} = ${result}`
    }]
  };
});

// Square Root: Calculates the square root, validates for non-negative input
server.tool("sqrt", {
  n: z.number().describe("Number to find square root of (must be non-negative)")
}, async (params) => {
  if (params.n < 0) {
    return {
      content: [{
        type: "text",
        text: "Error: Cannot calculate square root of a negative number"
      }]
    };
  }
  const result = Math.sqrt(params.n);
  return {
    content: [{
      type: "text",
      text: `√${params.n} = ${result}`
    }]
  };
});

/**
 * Factorial Calculator
 * Computes n! (n factorial) for non-negative integers
 * Includes validation for:
 * - Non-negative integers only
 * - Upper limit check to prevent overflow
 */
server.tool("factorial", {
  n: z.number().int().min(0).describe("Non-negative integer to calculate factorial of")
}, async (params) => {
  if (params.n > 170) {
    return {
      content: [{
        type: "text",
        text: "Error: Factorial result would be too large (exceeds Number.MAX_VALUE)"
      }]
    };
  }
  
  let result = 1;
  for (let i = 2; i <= params.n; i++) {
    result *= i;
  }
  
  return {
    content: [{
      type: "text",
      text: `${params.n}! = ${result}`
    }]
  };
});

// Initialize the server with stdio transport
// This allows the server to communicate via standard input/output
await server.connect(new StdioServerTransport());

// This server implements basic math functionality 