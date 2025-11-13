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
    uri: "file://path/to/user-guide.md",
    description: "Comprehensive user guide for the application",
    mimeType: "text/markdown",
    content: "# User Guide\n\nThis is a comprehensive guide for using our application..."
  },
  {
    name: "API Documentation", 
    uri: "file://path/to/api-docs.json",
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
    uri: "file://path/to/config-template.yaml",
    description: "Default configuration template for the service",
    mimeType: "application/yaml",
    content: "# Configuration Template\nserver:\n  port: 8080\n  host: localhost\ndatabase:\n  url: postgresql://localhost:5432/mydb"
  },
  {
    name: "Sample Data",
    uri: "file://path/to/sample-data.csv",
    description: "Sample dataset for testing and development",
    mimeType: "text/csv",
    content: "id,name,email,created_at\n1,John Doe,john@example.com,2024-01-01\n2,Jane Smith,jane@example.com,2024-01-02"
  },
  {
    name: "Release Notes",
    uri: "file://path/to/release-notes.txt",
    description: "Latest release notes and changelog",
    mimeType: "text/plain",
    content: "Release Notes v1.0.0\n\n- Initial release\n- Added user management\n- Implemented REST API\n- Added configuration system"
  },
  {
    name: "Sonic Image",
    uri: "file://path/to/sonic-image.jpeg",
    description: "Sample image resource - Sonic the Hedgehog character image",
    mimeType: "image/jpeg",
    content: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
  },
  {
    name: "Quick Reference Guide",
    uri: "file://path/to/quick-reference.md",
    description: "Quick reference card for common operations",
    mimeType: "text/markdown",
    content: "# Quick Reference\n\n## Common Commands\n- `get-resource-list`: List all available resources\n- Use resource URIs to fetch specific content\n\n## Resource Types\n- Markdown documents\n- JSON configurations\n- CSV data files\n- Image files"
  },
  {
    name: "Changelog",
    uri: "file://path/to/changelog.md",
    description: "Version history and changes",
    mimeType: "text/markdown",
    content: "# Changelog\n\n## Version 1.0.0\n- Initial release\n- Added 7 resources\n- Implemented resource listing tool"
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
    contents: resourceLinks
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());
