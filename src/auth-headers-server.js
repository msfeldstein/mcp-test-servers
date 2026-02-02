#!/usr/bin/env node

import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// Store the last seen headers for inspection via tool
let lastSeenHeaders = {};
let requestCount = 0;

// Create a new MCP server
const server = new McpServer(
  {
    name: "auth-headers-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "get-headers": {
          description: "Returns the headers from the last request",
        },
        "ping": {
          description: "Simple ping to trigger a request and log headers",
        }
      }
    }
  }
);

// Register tool to get the last seen headers
server.tool("get-headers", "Returns the headers from the last request", async () => {
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        requestCount,
        headers: lastSeenHeaders,
        authorization: lastSeenHeaders.authorization || "No Authorization header present"
      }, null, 2)
    }]
  };
});

// Simple ping tool that logs headers
server.tool("ping", "Simple ping to trigger a request and log headers", async () => {
  return {
    content: [{
      type: "text",
      text: `pong (request #${requestCount})`
    }]
  };
});

const app = express();
app.use(express.json());
app.use(cors());

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined, // stateless
});

// Setup the server connection
const setupServer = async () => {
  await server.connect(transport);
};

// Helper to log headers
const logHeaders = (req, method) => {
  requestCount++;
  lastSeenHeaders = { ...req.headers };
  
  console.error(`\n========== Request #${requestCount} (${method}) ==========`);
  console.error(`Timestamp: ${new Date().toISOString()}`);
  console.error(`Path: ${req.path}`);
  console.error(`\n--- All Headers ---`);
  
  Object.entries(req.headers).forEach(([key, value]) => {
    // Highlight authorization-related headers
    const isAuth = key.toLowerCase().includes('auth') || key.toLowerCase().includes('bearer');
    const prefix = isAuth ? '>>> ' : '    ';
    console.error(`${prefix}${key}: ${value}`);
  });
  
  // Specifically call out authorization
  if (req.headers.authorization) {
    console.error(`\n>>> Authorization Header Found <<<`);
    console.error(`    Value: ${req.headers.authorization}`);
    
    // Parse bearer token if present
    if (req.headers.authorization.startsWith('Bearer ')) {
      const token = req.headers.authorization.substring(7);
      console.error(`    Type: Bearer Token`);
      console.error(`    Token: ${token}`);
      
      // If it looks like a JWT, try to decode the payload (not verify)
      if (token.includes('.')) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            console.error(`    JWT Payload: ${JSON.stringify(payload, null, 2)}`);
          }
        } catch {
          console.error(`    (Could not decode as JWT)`);
        }
      }
    }
  } else {
    console.error(`\n!!! No Authorization Header !!!`);
  }
  
  console.error(`==========================================\n`);
};

app.post('/mcp', async (req, res) => {
  logHeaders(req, 'POST');
  
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

app.get('/mcp', async (req, res) => {
  logHeaders(req, 'GET');
  
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

app.delete('/mcp', async (req, res) => {
  logHeaders(req, 'DELETE');
  
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

// Start the server
const PORT = process.env.PORT || 3020;
setupServer().then(() => {
  app.listen(PORT, () => {
    console.error(`Auth Headers Server listening at http://localhost:${PORT}/mcp`);
    console.error(`All request headers will be logged to stderr`);
    console.error(`Use the 'get-headers' tool to retrieve the last seen headers`);
  });
}).catch(error => {
  console.error('Failed to set up the server:', error);
  process.exit(1);
});
