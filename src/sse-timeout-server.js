#!/usr/bin/env node

import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

// Create a new MCP server
const server = new McpServer(
  {
    name: "sse-timeout-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "ping": {
          description: "A simple tool that returns 'pong'",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        },
        "echo": {
          description: "Echo back the provided text",
          parameters: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "The text to echo back"
              }
            },
            required: ["text"]
          }
        }
      }
    }
  }
);

// Register tools
server.tool("ping", "A simple tool that returns 'pong'", async (params) => {
  return {
    content: [{
      type: "text",
      text: "pong"
    }]
  };
});

server.tool("echo", {
  text: z.string().describe("The text to echo back")
}, async (params) => {
  return {
    content: [{
      type: "text", 
      text: `Echo: ${params.text}`
    }]
  };
});

const app = express();
app.use(express.json());
app.use(cors());

// Store active SSE connections with their timeouts
const activeConnections = new Map();

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
});

// Setup server connection
const setupServer = async () => {
  await server.connect(transport);
};

// Handle POST requests (JSON-RPC messages)
app.post('/mcp', async (req, res) => {
  try {
    console.log('Received MCP request:', req.body);
    console.log('User-Agent:', req.get("User-Agent"));
    console.log('Accept header:', req.get("Accept"));

    // Let the transport handle the request normally first
    // We'll hook into the response to add timeout behavior if it's SSE
    const originalWriteHead = res.writeHead;
    const originalWrite = res.write;
    const originalEnd = res.end;
    
    let isSSE = false;
    let connectionId = null;
    let timeoutId = null;

    // Override writeHead to detect SSE responses
    res.writeHead = function(statusCode, headers) {
      if (headers && headers['Content-Type'] === 'text/event-stream') {
        isSSE = true;
        connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Set up 30-second timeout for SSE connections
        timeoutId = setTimeout(() => {
          console.log(`Connection ${connectionId} timed out after 30 seconds`);
          activeConnections.delete(connectionId);
          
          if (!res.destroyed) {
            res.write('event: timeout\n');
            res.write('data: {"message": "Connection timed out after 30 seconds"}\n\n');
            res.end();
          }
        }, 30000);

        // Store connection info
        activeConnections.set(connectionId, {
          response: res,
          timeoutId: timeoutId,
          startTime: Date.now()
        });

        console.log(`SSE connection established: ${connectionId}`);
      }
      
      return originalWriteHead.call(this, statusCode, headers);
    };

    // Override write to add connection info to SSE streams
    res.write = function(chunk) {
      if (isSSE && connectionId && typeof chunk === 'string' && chunk.includes('data:')) {
        // Add connection info to the first data event
        if (!res._connectionInfoSent) {
          const infoEvent = `event: connection-info\ndata: {"connectionId": "${connectionId}", "timeout": 30}\n\n`;
          originalWrite.call(this, infoEvent);
          res._connectionInfoSent = true;
        }
      }
      return originalWrite.call(this, chunk);
    };

    // Handle client disconnect
    res.on('close', () => {
      if (connectionId && activeConnections.has(connectionId)) {
        const conn = activeConnections.get(connectionId);
        if (conn.timeoutId) {
          clearTimeout(conn.timeoutId);
        }
        activeConnections.delete(connectionId);
        console.log(`Connection ${connectionId} closed by client`);
      }
    });

    // Handle the actual MCP request using the transport
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

// Handle GET requests (establish SSE stream without initial request)
app.get('/mcp', async (req, res) => {
  try {
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Mcp-Session-Id',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE'
    });

    // Generate a unique connection ID
    const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Set up 30-second timeout
    const timeoutId = setTimeout(() => {
      // Clean up connection
      activeConnections.delete(connectionId);
      
      // Close the SSE stream
      if (!res.destroyed) {
        res.write('event: timeout\n');
        res.write('data: {"message": "Connection timed out after 30 seconds"}\n\n');
      }
      res.end();
    }, 30000); // 30 seconds

    // Store connection info
    activeConnections.set(connectionId, {
      response: res,
      timeoutId: timeoutId,
      startTime: Date.now()
    });

    // Handle client disconnect
    res.on('close', () => {
      const conn = activeConnections.get(connectionId);
      if (conn) {
        clearTimeout(conn.timeoutId);
        activeConnections.delete(connectionId);
      }
    });

    // Send initial connection event
    res.write('event: connected\n');
    res.write(`data: {"connectionId": "${connectionId}", "timeout": 30}\n\n`);

    // Send periodic heartbeat to keep connection alive until timeout
    const heartbeatInterval = setInterval(() => {
      const conn = activeConnections.get(connectionId);
      if (conn && !res.destroyed) {
        const elapsed = Math.floor((Date.now() - conn.startTime) / 1000);
        const remaining = Math.max(0, 30 - elapsed);
        
        res.write('event: heartbeat\n');
        res.write(`data: {"elapsed": ${elapsed}, "remaining": ${remaining}}\n\n`);
        
        if (remaining <= 0) {
          clearInterval(heartbeatInterval);
        }
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 5000); // Send heartbeat every 5 seconds

    // Clean up heartbeat on connection close
    res.on('close', () => {
      clearInterval(heartbeatInterval);
    });

  } catch (error) {
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

// Handle DELETE requests (session termination)
app.delete('/mcp', async (req, res) => {
  const sessionId = req.get('Mcp-Session-Id');
  
  if (sessionId) {
    // Find and clean up any connections for this session
    for (const [connId, conn] of activeConnections.entries()) {
      if (connId.includes(sessionId) || sessionId.includes(connId)) {
        clearTimeout(conn.timeoutId);
        if (!conn.response.destroyed) {
          conn.response.write('event: session-terminated\n');
          conn.response.write('data: {"message": "Session terminated by client"}\n\n');
          conn.response.end();
        }
        activeConnections.delete(connId);
      }
    }
  }
  
  res.status(200).json({ message: "Session terminated" });
});

// Handle OPTIONS requests for CORS
app.options('/mcp', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id');
  res.status(200).end();
});

// Start the server
const PORT = 3003;
setupServer().then(() => {
  app.listen(PORT, () => {
    console.log(`MCP SSE Timeout Server listening at http://localhost:${PORT}/mcp`);
    console.log(`This server establishes SSE connections that timeout after 30 seconds`);
    console.log(`Active connections: ${activeConnections.size}`);
    
    // Log active connections periodically
    setInterval(() => {
      if (activeConnections.size > 0) {
        console.log(`Active connections: ${activeConnections.size}`);
        for (const [connId, conn] of activeConnections.entries()) {
          const elapsed = Math.floor((Date.now() - conn.startTime) / 1000);
          console.log(`  ${connId}: ${elapsed}s elapsed`);
        }
      }
    }, 10000);
  });
}).catch(error => {
  console.error('Failed to set up the server:', error);
  process.exit(1);
});

// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  
  // Close all active connections
  for (const [connId, conn] of activeConnections.entries()) {
    clearTimeout(conn.timeoutId);
    if (!conn.response.destroyed) {
      conn.response.write('event: server-shutdown\n');
      conn.response.write('data: {"message": "Server shutting down"}\n\n');
      conn.response.end();
    }
  }
  activeConnections.clear();
  
  await server.close();
  console.log('Server shutdown complete');
  process.exit(0);
});
