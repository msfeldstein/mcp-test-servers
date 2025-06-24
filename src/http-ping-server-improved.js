#!/usr/bin/env node

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// Configuration
const CONFIG = {
  port: process.env.PORT || 3001,
  serverName: "ping-server",
  serverVersion: "1.0.0"
};

// Create MCP server with improved configuration
const createMcpServer = () => {
  const server = new McpServer({
    name: CONFIG.serverName,
    version: CONFIG.serverVersion,
    capabilities: {
      tools: {
        ping: {
          description: "A simple tool that returns 'pong'",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      }
    }
  });

  // Register tools
  server.tool("ping", async () => ({
    content: [{
      type: "text",
      text: "pong"
    }]
  }));

  return server;
};

// Create standardized JSON-RPC error response
const createErrorResponse = (code, message, id = null) => ({
  jsonrpc: "2.0",
  error: { code, message },
  id
});

// Setup Express application
const createApp = (transport) => {
  const app = express();
  
  // Middleware
  app.use(express.json({ limit: '10mb' }));
  
  // Request logging middleware (only in development)
  if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      console.log(`${req.method} ${req.path} - ${req.get('User-Agent')}`);
      next();
    });
  }

  // MCP POST endpoint
  app.post('/mcp', async (req, res) => {
    try {
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('MCP request error:', error.message);
      
      if (!res.headersSent) {
        res.status(500).json(createErrorResponse(-32603, 'Internal server error'));
      }
    }
  });

  // Handle unsupported HTTP methods
  const handleUnsupportedMethod = (req, res) => {
    res.status(405).json(createErrorResponse(-32000, 'Method not allowed'));
  };

  app.get('/mcp', handleUnsupportedMethod);
  app.delete('/mcp', handleUnsupportedMethod);
  app.put('/mcp', handleUnsupportedMethod);
  app.patch('/mcp', handleUnsupportedMethod);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      server: CONFIG.serverName,
      version: CONFIG.serverVersion,
      timestamp: new Date().toISOString()
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Endpoint ${req.originalUrl} not found`
    });
  });

  // Global error handler
  app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json(createErrorResponse(-32603, 'Internal server error'));
  });

  return app;
};

// Main server initialization
const initializeServer = async () => {
  try {
    // Create MCP server and transport
    const mcpServer = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined // Stateless server
    });

    // Connect MCP server to transport
    await mcpServer.connect(transport);

    // Create Express app
    const app = createApp(transport);

    // Start HTTP server
    const server = app.listen(CONFIG.port, () => {
      console.log(`MCP HTTP Server running on http://localhost:${CONFIG.port}`);
      console.log(`Health check: http://localhost:${CONFIG.port}/health`);
      console.log(`MCP endpoint: http://localhost:${CONFIG.port}/mcp`);
    });

    // Graceful shutdown handling
    const shutdown = (signal) => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return server;

  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
};

// Start the server
initializeServer().catch(error => {
  console.error('Server startup failed:', error);
  process.exit(1);
});
