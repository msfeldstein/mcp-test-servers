#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create a new MCP server with stdio transport
const server = new McpServer(
    {
        name: "dynamic-tools-server",
        version: "1.0.0",
        capabilities: {
            tools: {
                "enableTools": {
                    description: "Enable the optional tool",
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

// Register the optional tool dynamically
const optionalTool = server.tool("optionalTool", {
    message: z.string().optional().describe("Optional message to include with hello")
}, async (params) => {
    const message = params?.message ? ` ${params.message}` : "";
    return {
        content: [{
            type: "text",
            text: `hello${message}`
        }]
    };
});
optionalTool.disable();

// Register the enableTools tool - this is always available
server.tool("toggleTool", async (params) => {
    try {
        if (optionalTool.enabled) {
            optionalTool.disable();
        } else {
            optionalTool.enable();
        }

        return {
            content: [{
                type: "text",
                text: `Success! The 'optionalTool' has been ${optionalTool.enabled ? "enabled" : "disabled"}.`
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Error toggling tool: ${error.message}`
            }]
        };
    }
});

// Register a status tool to check current tool state
server.tool("checkToolStatus", "Check the current status of the optional tool", async (params) => {
    return {
        content: [{
            type: "text",
            text: `The 'optionalTool' is currently ${optionalTool.enabled ? "enabled" : "disabled"}.`
        }]
    };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());

// This server demonstrates dynamic tool management where tools can be enabled at runtime 