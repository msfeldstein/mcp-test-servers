#!/usr/bin/env node

/*
Sessions drift away,
Silent timeouts mark the end,
Memory fades to peace.
*/

import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

// Store active sessions with their last activity time
const activeSessions = new Map();
const SESSION_TIMEOUT_MS = 30000; // 30 seconds of inactivity

// Session cleanup interval
const CLEANUP_INTERVAL_MS = 5000; // Check every 5 seconds

// Simple session ID generator
const generateSessionId = () => {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Create a new MCP server
const server = new McpServer(
  {
    name: "session-inactivity-server",
    version: "1.0.0"
  }
);

// Register tools
server.tool("ping", "A simple tool that returns 'pong' and tracks session activity", async (params, context) => {
  // Track session activity
  const sessionId = context?.sessionId || generateSessionId();
  const now = Date.now();
  
  if (!activeSessions.has(sessionId)) {
    activeSessions.set(sessionId, {
      id: sessionId,
      createdAt: now,
      lastActivity: now,
      requestCount: 0
    });
    console.log(`New session created via ping: ${sessionId}`);
  }
  
  const session = activeSessions.get(sessionId);
  session.lastActivity = now;
  session.requestCount = (session.requestCount || 0) + 1;
  
  console.log(`Ping from session: ${sessionId} (request #${session.requestCount})`);
  
  return {
    content: [{
      type: "text",
      text: `pong (session: ${sessionId}, request #${session.requestCount})`
    }]
  };
});

server.tool("echo", {
  text: z.string().describe("The text to echo back")
}, async (params, context) => {
  // Track session activity
  const sessionId = context?.sessionId || generateSessionId();
  const now = Date.now();
  
  if (!activeSessions.has(sessionId)) {
    activeSessions.set(sessionId, {
      id: sessionId,
      createdAt: now,
      lastActivity: now,
      requestCount: 0
    });
    console.log(`New session created via echo: ${sessionId}`);
  }
  
  const session = activeSessions.get(sessionId);
  session.lastActivity = now;
  session.requestCount = (session.requestCount || 0) + 1;
  
  console.log(`Echo from session: ${sessionId} (request #${session.requestCount})`);
  
  return {
    content: [{
      type: "text", 
      text: `Echo: ${params.text} (session: ${sessionId}, request #${session.requestCount})`
    }]
  };
});

server.tool("get-session-info", "Get session information including time until expiry", async (params, context) => {
  const sessionId = context?.sessionId;
  const now = Date.now();
  
  if (!sessionId || !activeSessions.has(sessionId)) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ 
          error: "No active session found",
          activeSessions: activeSessions.size,
          allSessionIds: Array.from(activeSessions.keys())
        }, null, 2)
      }]
    };
  }
  
  const session = activeSessions.get(sessionId);
  const sessionInfo = {
    sessionId: session.id,
    createdAt: new Date(session.createdAt).toISOString(),
    lastActivity: new Date(session.lastActivity).toISOString(),
    requestCount: session.requestCount,
    timeUntilExpiry: Math.max(0, SESSION_TIMEOUT_MS - (now - session.lastActivity)),
    timeUntilExpirySeconds: Math.max(0, Math.floor((SESSION_TIMEOUT_MS - (now - session.lastActivity)) / 1000)),
    totalActiveSessions: activeSessions.size
  };
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify(sessionInfo, null, 2)
    }]
  };
});

const app = express();
app.use(express.json());
app.use(cors());

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined, // Let MCP handle sessions
});

// Setup server connection
const setupServer = async () => {
  await server.connect(transport);
};

// Session cleanup function
const cleanupExpiredSessions = () => {
  const now = Date.now();
  const expiredSessions = [];
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      expiredSessions.push(sessionId);
    }
  }
  
  for (const sessionId of expiredSessions) {
    activeSessions.delete(sessionId);
    console.log(`Session expired due to inactivity: ${sessionId}`);
  }
  
  if (expiredSessions.length > 0) {
    console.log(`Active sessions: ${activeSessions.size}`);
  }
};

// Start cleanup interval
const cleanupInterval = setInterval(cleanupExpiredSessions, CLEANUP_INTERVAL_MS);

// Session management is now handled within the tools themselves

// Handle POST requests (JSON-RPC messages)
app.post('/mcp', async (req, res) => {
  try {
    console.log('Received MCP request:', req.body?.method || 'unknown');
    console.log('User-Agent:', req.get("User-Agent"));

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
        id: req.body?.id || null,
      });
    }
  }
});

// Handle GET requests (establish SSE stream)
app.get('/mcp', (req, res) => {
  console.log('Received GET MCP request');
  console.log('User-Agent:', req.get("User-Agent"));
  
  // This server doesn't support GET requests for SSE streams
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed. This server only supports POST requests."
    },
    id: null
  });
});

// Handle DELETE requests (not supported)
app.delete('/mcp', (req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed. This server only supports POST requests."
    },
    id: null
  });
});

// Handle OPTIONS requests for CORS
app.options('/mcp', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id');
  res.status(200).end();
});

// Start the server
const PORT = 3004;
setupServer().then(() => {
  app.listen(PORT, () => {
    console.log(`MCP Session Inactivity Server listening at http://localhost:${PORT}/mcp`);
    console.log(`Sessions expire after ${SESSION_TIMEOUT_MS / 1000} seconds of inactivity`);
    console.log(`Cleanup runs every ${CLEANUP_INTERVAL_MS / 1000} seconds`);
    console.log(`Active sessions: ${activeSessions.size}`);
  });
}).catch(error => {
  console.error('Failed to set up the server:', error);
  process.exit(1);
});

// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  
  clearInterval(cleanupInterval);
  activeSessions.clear();
  
  await server.close();
  console.log('Server shutdown complete');
  process.exit(0);
});
