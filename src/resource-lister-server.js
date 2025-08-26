#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "resource-lister-server",
    version: "1.0.0"
  }
);

// Define our 5 resources
const resources = [
  {
    name: "User Guide",
    uri: "resource://user-guide.md",
    description: "Comprehensive user guide for the application",
    mimeType: "text/markdown",
    content: "# User Guide\n\nThis is a comprehensive guide for using our application..."
  },
  {
    name: "API Documentation", 
    uri: "resource://api-docs.json",
    description: "REST API documentation and endpoints",
    mimeType: "application/json",
    content: JSON.stringify({
      "version": "1.0",
      "endpoints": [
        {"path": "/users", "method": "GET", "description": "List all users"},
        {"path": "/users/{id}", "method": "GET", "description": "Get user by ID"}
      ]
    }, null, 2)
  },
  {
    name: "Configuration Template",
    uri: "resource://config-template.yaml",
    description: "Default configuration template for the service",
    mimeType: "application/yaml",
    content: "# Configuration Template\nserver:\n  port: 8080\n  host: localhost\ndatabase:\n  url: postgresql://localhost:5432/mydb"
  },
  {
    name: "Sample Data",
    uri: "resource://sample-data.csv",
    description: "Sample dataset for testing and development",
    mimeType: "text/csv",
    content: "id,name,email,created_at\n1,John Doe,john@example.com,2024-01-01\n2,Jane Smith,jane@example.com,2024-01-02"
  },
  {
    name: "Release Notes",
    uri: "resource://release-notes.txt",
    description: "Latest release notes and changelog",
    mimeType: "text/plain",
    content: "Release Notes v1.0.0\n\n- Initial release\n- Added user management\n- Implemented REST API\n- Added configuration system"
  }
];

// Register each resource
resources.forEach(resource => {
  server.resource(
    resource.name,
    resource.uri,
    {
      description: resource.description,
      mimeType: resource.mimeType
    },
    async () => ({
      contents: [
        {
          uri: resource.uri,
          mimeType: resource.mimeType,
          text: resource.content
        }
      ]
    })
  );
});

// Register the get-resource-list tool
server.tool("get-resource-list", "Returns a list of all available resources as resource links", async (params) => {
  // Return resource links for each resource
  const resourceLinks = resources.map(resource => ({
    type: "resource_link",
    uri: resource.uri,
    name: resource.name,
    description: resource.description,
    mimeType: resource.mimeType,
    annotations: {
      audience: ["user", "assistant"],
      priority: 0.8
    }
  }));

  return {
    content: resourceLinks
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());
