#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import crypto from "crypto";

const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const AUTH_SERVER_PORT = process.env.AUTH_SERVER_PORT || 3002;
const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || `http://localhost:${AUTH_SERVER_PORT}`;

// This server reproduces the OAuth issue described where Cursor loses track of 
// the authorization server endpoints during the callback handling

const app = express();
const authApp = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
authApp.use(express.json());
authApp.use(express.urlencoded({ extended: true }));

// In-memory storage for OAuth state
const authCodes = new Map();
const accessTokens = new Map();
const clients = new Map();

// Register a test client
const CLIENT_ID = "test-client-id";
const CLIENT_SECRET = "test-client-secret";
clients.set(CLIENT_ID, {
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  redirect_uris: ["cursor://anysphere.cursor-retrieval/oauth/user-hound/callback"],
  scopes: ["mcp.read"]
});

// ============================================================================
// AUTHORIZATION SERVER (separate port to mirror real-world setup)
// ============================================================================

// OAuth Authorization Server Discovery Endpoint
authApp.get("/.well-known/oauth-authorization-server", (req, res) => {
  res.json({
    issuer: AUTH_SERVER_URL,
    authorization_endpoint: `${AUTH_SERVER_URL}/oauth/authorize`,
    token_endpoint: `${AUTH_SERVER_URL}/oauth/token`,
    jwks_endpoint: `${AUTH_SERVER_URL}/.well-known/jwks.json`,
    registration_endpoint: `${AUTH_SERVER_URL}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    introspection_endpoint: `${AUTH_SERVER_URL}/oauth/introspect`,
    code_challenge_methods_supported: ["S256"],
    userinfo_endpoint: `${AUTH_SERVER_URL}/oauth/userinfo`
  });
});

// JWKS endpoint (minimal for testing)
authApp.get("/.well-known/jwks.json", (req, res) => {
  res.json({
    keys: [
      {
        kty: "RSA",
        kid: "test-key-1",
        use: "sig",
        alg: "RS256",
        n: "test-modulus",
        e: "AQAB"
      }
    ]
  });
});

// Authorization endpoint
authApp.get("/oauth/authorize", (req, res) => {
  const { client_id, redirect_uri, response_type, scope, state, code_challenge, code_challenge_method } = req.query;
  
  console.log("Authorization request received:", { client_id, redirect_uri, response_type, scope, state });
  
  // Validate client
  const client = clients.get(client_id);
  if (!client) {
    return res.status(400).json({ error: "invalid_client" });
  }
  
  if (!client.redirect_uris.includes(redirect_uri)) {
    return res.status(400).json({ error: "invalid_redirect_uri" });
  }
  
  // Generate authorization code
  const authCode = `tbac__${crypto.randomBytes(16).toString('hex')}`;
  authCodes.set(authCode, {
    client_id,
    redirect_uri,
    scope,
    code_challenge,
    code_challenge_method,
    expires_at: Date.now() + 600000 // 10 minutes
  });
  
  // In a real implementation, this would show a consent screen
  // For testing, we auto-approve and redirect
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', authCode);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }
  
  console.log("Redirecting to:", redirectUrl.toString());
  res.redirect(redirectUrl.toString());
});

// Token endpoint
authApp.post("/oauth/token", (req, res) => {
  const { grant_type, code, redirect_uri, client_id, client_secret, code_verifier } = req.body;
  
  console.log("Token request received:", { grant_type, code, redirect_uri, client_id });
  
  if (grant_type !== "authorization_code") {
    return res.status(400).json({ error: "unsupported_grant_type" });
  }
  
  // Validate client
  const client = clients.get(client_id);
  if (!client || client.client_secret !== client_secret) {
    return res.status(401).json({ error: "invalid_client" });
  }
  
  // Validate authorization code
  const authData = authCodes.get(code);
  if (!authData || authData.expires_at < Date.now()) {
    authCodes.delete(code);
    return res.status(400).json({ error: "invalid_grant" });
  }
  
  if (authData.client_id !== client_id || authData.redirect_uri !== redirect_uri) {
    return res.status(400).json({ error: "invalid_grant" });
  }
  
  // Validate PKCE if present
  if (authData.code_challenge) {
    if (!code_verifier) {
      return res.status(400).json({ error: "invalid_request", error_description: "code_verifier required" });
    }
    
    const hash = crypto.createHash('sha256').update(code_verifier).digest('base64url');
    if (hash !== authData.code_challenge) {
      return res.status(400).json({ error: "invalid_grant", error_description: "invalid code_verifier" });
    }
  }
  
  // Generate access token
  const accessToken = `mcp_${crypto.randomBytes(32).toString('hex')}`;
  const refreshToken = `ref_${crypto.randomBytes(32).toString('hex')}`;
  
  accessTokens.set(accessToken, {
    client_id,
    scope: authData.scope,
    expires_at: Date.now() + 3600000 // 1 hour
  });
  
  // Clean up authorization code
  authCodes.delete(code);
  
  res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: refreshToken,
    scope: authData.scope
  });
});

// Userinfo endpoint
authApp.get("/oauth/userinfo", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "invalid_token" });
  }
  
  const token = authHeader.substring(7);
  const tokenData = accessTokens.get(token);
  
  if (!tokenData || tokenData.expires_at < Date.now()) {
    return res.status(401).json({ error: "invalid_token" });
  }
  
  res.json({
    sub: "test-user-123",
    name: "Test User",
    email: "test@example.com"
  });
});

// Token introspection endpoint
authApp.post("/oauth/introspect", (req, res) => {
  const { token } = req.body;
  const tokenData = accessTokens.get(token);
  
  if (!tokenData || tokenData.expires_at < Date.now()) {
    return res.json({ active: false });
  }
  
  res.json({
    active: true,
    client_id: tokenData.client_id,
    scope: tokenData.scope,
    exp: Math.floor(tokenData.expires_at / 1000)
  });
});

// ============================================================================
// RESOURCE SERVER (main MCP server)
// ============================================================================

// OAuth Protected Resource Discovery Endpoint
app.get("/.well-known/oauth-protected-resource", (req, res) => {
  res.json({
    resource: `${BASE_URL}/mcp`,
    authorization_servers: [AUTH_SERVER_URL],
    jwks_uri: `${AUTH_SERVER_URL}/.well-known/jwks.json`,
    scopes_supported: ["mcp.read"]
  });
});

// MCP endpoint that requires authentication
app.all("/mcp*", (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.set('WWW-Authenticate', `Bearer resource_metadata="${BASE_URL}/.well-known/oauth-protected-resource"`);
    return res.status(401).send('Unauthorized');
  }
  
  const token = authHeader.substring(7);
  const tokenData = accessTokens.get(token);
  
  if (!tokenData || tokenData.expires_at < Date.now()) {
    res.set('WWW-Authenticate', `Bearer resource_metadata="${BASE_URL}/.well-known/oauth-protected-resource"`);
    return res.status(401).send('Unauthorized');
  }
  
  // Token is valid, continue to MCP handling
  req.tokenData = tokenData;
  next();
});

// Configure the MCP Server for HTTP transport
const server = new McpServer(
  {
    name: "oauth-repro-server",
    version: "1.0.0",
    capabilities: {
      tools: {}
    }
  }
);

// Register a test tool
server.tool("whoami", "Returns information about the authenticated user", async (params, context) => {
  // Check if we have an authorization header
  const authHeader = context?.meta?.headers?.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      content: [{
        type: "text",
        text: "No authentication provided"
      }]
    };
  }
  
  const token = authHeader.substring(7);
  const tokenData = accessTokens.get(token);
  
  if (!tokenData || tokenData.expires_at < Date.now()) {
    return {
      content: [{
        type: "text", 
        text: "Invalid or expired token"
      }]
    };
  }
  
  // Make a request to the userinfo endpoint to get user details
  try {
    const response = await fetch(`${AUTH_SERVER_URL}/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const userInfo = await response.json();
      return {
        content: [{
          type: "text",
          text: `Authenticated as: ${userInfo.name} (${userInfo.email})`
        }]
      };
    }
  } catch (error) {
    console.error("Error fetching user info:", error);
  }
  
  return {
    content: [{
      type: "text",
      text: "Authentication context not available"
    }]
  };
});

// Create HTTP transport for MCP server
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined, // stateless server
});

// Setup MCP server connection
const setupServer = async () => {
  await server.connect(transport);
};

// Add MCP endpoint
app.post('/mcp', async (req, res) => {
  console.log('Received MCP request:', req.body);
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
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

// Start both servers
authApp.listen(AUTH_SERVER_PORT, () => {
  console.log(`OAuth Authorization Server listening on port ${AUTH_SERVER_PORT}`);
  console.log(`Authorization Server URL: ${AUTH_SERVER_URL}`);
  console.log(`Discovery: ${AUTH_SERVER_URL}/.well-known/oauth-authorization-server`);
});

setupServer().then(() => {
  app.listen(PORT, () => {
    console.log(`OAuth Reproduction MCP Server listening on port ${PORT}`);
    console.log(`Resource Server URL: ${BASE_URL}`);
    console.log(`MCP Endpoint: ${BASE_URL}/mcp`);
    console.log(`Resource Discovery: ${BASE_URL}/.well-known/oauth-protected-resource`);
    console.log("");
    console.log("This server reproduces the OAuth issue where Cursor loses track of");
    console.log("authorization server endpoints during callback handling.");
    console.log("");
    console.log("Test with:");
    console.log(`curl --head ${BASE_URL}/mcp`);
    console.log(`curl -s ${BASE_URL}/.well-known/oauth-protected-resource | jq`);
    console.log(`curl -s ${AUTH_SERVER_URL}/.well-known/oauth-authorization-server | jq`);
  });
}).catch(error => {
  console.error('Failed to set up the MCP server:', error);
  process.exit(1);
});
