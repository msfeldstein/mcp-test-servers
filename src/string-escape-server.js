#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "string-escape-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "echo_with_spaces": {
          description: "Echoes text that may contain spaces, quotes, and special characters",
          parameters: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "Text to echo - can contain spaces, quotes, and special characters"
              }
            },
            required: ["text"]
          }
        },
        "parse_quoted_string": {
          description: "Parses a quoted string and returns its contents without quotes",
          parameters: {
            type: "object",
            properties: {
              quoted_text: {
                type: "string",
                description: "A quoted string (e.g., \"hello world\" or 'hello world')"
              }
            },
            required: ["quoted_text"]
          }
        },
        "handle_escaped_chars": {
          description: "Demonstrates handling of escaped characters like \\n, \\t, \\\", etc.",
          parameters: {
            type: "object",
            properties: {
              escaped_text: {
                type: "string",
                description: "Text with escaped characters (\\n for newline, \\t for tab, \\\" for quote, etc.)"
              }
            },
            required: ["escaped_text"]
          }
        },
        "multiple_args_with_spaces": {
          description: "Takes multiple string arguments that may contain spaces",
          parameters: {
            type: "object",
            properties: {
              arg1: {
                type: "string",
                description: "First argument - can contain spaces"
              },
              arg2: {
                type: "string",
                description: "Second argument - can contain spaces"
              },
              arg3: {
                type: "string",
                description: "Third argument - optional, can contain spaces"
              }
            },
            required: ["arg1", "arg2"]
          }
        }
      }
    }
  }
);

// Tool to echo text with spaces
server.tool("echo_with_spaces", {
  text: z.string().describe("Text to echo - can contain spaces, quotes, and special characters")
}, async (params) => {
  return {
    content: [{
      type: "text",
      text: `Echoed: "${params.text}"`
    }]
  };
});

// Tool to parse quoted strings
server.tool("parse_quoted_string", {
  quoted_text: z.string().describe("A quoted string (e.g., \"hello world\" or 'hello world')")
}, async (params) => {
  let parsed = params.quoted_text;
  
  // Remove surrounding quotes if present
  if ((parsed.startsWith('"') && parsed.endsWith('"')) || 
      (parsed.startsWith("'") && parsed.endsWith("'"))) {
    parsed = parsed.slice(1, -1);
  }
  
  return {
    content: [{
      type: "json",
      json: {
        original: params.quoted_text,
        parsed: parsed,
        length: parsed.length,
        has_spaces: parsed.includes(' ')
      }
    }]
  };
});

// Tool to handle escaped characters
server.tool("handle_escaped_chars", {
  escaped_text: z.string().describe("Text with escaped characters (\\n for newline, \\t for tab, \\\" for quote, etc.)")
}, async (params) => {
  // Process common escape sequences
  const processed = params.escaped_text
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
  
  return {
    content: [{
      type: "json",
      json: {
        original: params.escaped_text,
        processed: processed,
        escape_sequences_found: {
          newlines: (params.escaped_text.match(/\\n/g) || []).length,
          tabs: (params.escaped_text.match(/\\t/g) || []).length,
          quotes: (params.escaped_text.match(/\\['"]/g) || []).length,
          backslashes: (params.escaped_text.match(/\\\\/g) || []).length
        }
      }
    }]
  };
});

// Tool to handle multiple arguments with spaces
server.tool("multiple_args_with_spaces", {
  arg1: z.string().describe("First argument - can contain spaces"),
  arg2: z.string().describe("Second argument - can contain spaces"),
  arg3: z.string().optional().describe("Third argument - optional, can contain spaces")
}, async (params) => {
  const results = {
    arg1: {
      value: params.arg1,
      has_spaces: params.arg1.includes(' '),
      word_count: params.arg1.split(/\s+/).length
    },
    arg2: {
      value: params.arg2,
      has_spaces: params.arg2.includes(' '),
      word_count: params.arg2.split(/\s+/).length
    }
  };
  
  if (params.arg3) {
    results.arg3 = {
      value: params.arg3,
      has_spaces: params.arg3.includes(' '),
      word_count: params.arg3.split(/\s+/).length
    };
  }
  
  return {
    content: [{
      type: "json",
      json: results
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());

// This server demonstrates proper handling of string arguments with spaces and special characters
// Usage examples:
// - echo_with_spaces with text: "hello world"
// - parse_quoted_string with quoted_text: "\"hello world\""
// - handle_escaped_chars with escaped_text: "line1\\nline2\\ttabbed"
// - multiple_args_with_spaces with arg1: "first arg", arg2: "second arg"