#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Define the Zod schema based on the JSON schema
const BugsnagUrlParamsSchema = z.object({
  error_url: z.string().url().regex(
    /^https:\/\/app\.bugsnag\.com\/([^/]+)\/([^/]+)\/errors\/([^/]+)/,
    "URL must match the pattern https://app.bugsnag.com/{org}/{project}/errors/{error_id}"
  ).describe("a URL in the form https://app.bugsnag.com/{org}/{project}/errors/{error_id}")
});

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "pattern-param-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "parse_bugsnag_error_url": {
          description: "This tool will take a URL of an error in Bugsnag, and will parse out the organization slug, project slug, and error ID. Returns fields for org_slug, project_slug, and error_id",
          parameters: {
            type: "object",
            properties: {
              error_url: {
                type: "string",
                pattern: "^https:.*",
                description: "a URL in the form https://app.bugsnag.com/{org}/{project}/errors/{error_id}"
              }
            },
            required: ["error_url"]
          }
        }
      }
    }
  }
);

// Register the parse_bugsnag_error_url tool with a parameter shape, not a full Zod object
server.tool("parse_bugsnag_error_url", {
  error_url: z.object({
    type: "string",
    pattern: 'https:\\\\/\\\\/app.bugsnag.com\\\\/(?<org_slug>.*)\\\\/(?<project_slug>.*)\\\\/errors\\\\/(?<error_id>.*)',
    description: "a URL in the form https://app.bugsnag.com/{org}/{project}/errors/{error_id}"
  }).describe("a URL in the form https://app.bugsnag.com/{org}/{project}/errors/{error_id}")
}, async (params) => {
  const url = params.error_url;
  const match = url.match(/^https:\/\/app\.bugsnag\.com\/([^/]+)\/([^/]+)\/errors\/([^/]+)/);

  if (!match) {
    // This should ideally be caught by Zod validation, but double-check
    throw new Error("Invalid Bugsnag URL format.");
  }

  const [, org_slug, project_slug, error_id] = match;

  return {
    content: [{
      type: "json",
      json: {
        org_slug,
        project_slug,
        error_id
      }
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());
