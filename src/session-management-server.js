#!/usr/bin/env node

import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// Store active sessions for manual session management
const activeSessions = new Map();

// Simple session ID generator without uuid dependency
const generateSessionId = () => {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Create a new MCP server
const server = new McpServer(
  {
    name: "session-management-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "ping": {
          description: "A simple tool that returns 'pong' and session info",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        },
        "terminate-session": {
          description: "Terminate the current session (for testing purposes)",
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

// Register the ping tool
server.tool("ping", async (params) => {
  return {
    content: [{
      type: "text",
      text: "pong"
    }]
  };
});

// Register the terminate-session tool
server.tool("terminate-session", async (params) => {
  // This will be handled by the transport's session management
  return {
    content: [{
      type: "text",
      text: "Session termination requested"
    }]
  };
});

const app = express();
app.use(express.json());

// Custom session ID generator that creates globally unique IDs
const sessionIdGenerator = () => {
  return generateSessionId();
};

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined, // We'll handle session management manually
});

// Setup routes for the server
const setupServer = async () => {
  await server.connect(transport);
};

app.post('/mcp', async (req, res) => {
  console.log('Received MCP request:', req.body);
  console.log('Headers:', req.headers);
  
  const sessionId = req.headers['mcp-session-id'] || req.headers['Mcp-Session-Id'];
  
  try {
    // Handle initialization requests
    if (req.body.method === 'initialize') {
      // Generate a new session ID for initialization
      const newSessionId = sessionIdGenerator();
      activeSessions.set(newSessionId, {
        createdAt: new Date(),
        lastActivity: new Date()
      });
      
      // Set the session ID header before calling transport
      res.setHeader('Mcp-Session-Id', newSessionId);
      
      // Call the transport to handle the request
      await transport.handleRequest(req, res, req.body);
      return;
    }
    
    // For non-initialization requests, check if session ID is required
    if (!sessionId) {
      console.log('Missing session ID, returning 400 Bad Request');
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Missing Mcp-Session-Id header',
          data: {
            details: 'Session ID is required for all requests after initialization'
          }
        },
        id: req.body.id || null,
      });
      return;
    }
    
    // Check if session exists
    if (!activeSessions.has(sessionId)) {
      console.log(`Session ${sessionId} not found, returning 404 Not Found`);
      res.status(404).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Session not found',
          data: {
            details: 'Session has been terminated or does not exist'
          }
        },
        id: req.body.id || null,
      });
      return;
    }
    
    // Update session activity
    const session = activeSessions.get(sessionId);
    session.lastActivity = new Date();
    
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
        id: req.body.id || null,
      });
    }
  }
});

app.get('/mcp', async (req, res) => {
  console.log('Received GET MCP request');
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
  console.log('Received DELETE MCP request');
  const sessionId = req.headers['mcp-session-id'] || req.headers['Mcp-Session-Id'];
  
  if (sessionId) {
    // Terminate the session
    if (activeSessions.has(sessionId)) {
      activeSessions.delete(sessionId);
      console.log(`Session ${sessionId} terminated`);
    }
    
    // Return 404 to indicate session is terminated
    res.status(404).json({
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: "Session has been terminated"
      },
      id: null
    });
  } else {
    // No session ID provided
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: "Missing Mcp-Session-Id header"
      },
      id: null
    });
  }
});

// Start the server
const PORT = 3005;
setupServer().then(() => {
  app.listen(PORT, () => {
    console.log(`MCP Session Management Server listening at http://localhost:${PORT}/mcp`);
    console.log('This server implements session management according to the MCP spec:');
    console.log('- Assigns session IDs during initialization');
    console.log('- Requires session IDs in subsequent requests (returns 400 if missing)');
    console.log('- Returns 404 when session is terminated');
    console.log('- Handles DELETE requests for session termination');
  });
}).catch(error => {
  console.error('Failed to set up the server:', error);
  process.exit(1);
});
