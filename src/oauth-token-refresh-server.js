#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import crypto from "crypto";

const PORT = process.env.PORT || 3010;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const AUTH_SERVER_PORT = process.env.AUTH_SERVER_PORT || 3011;
const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || `http://localhost:${AUTH_SERVER_PORT}`;

// Configurable token expiration (default: 30 seconds for testing)
const ACCESS_TOKEN_EXPIRY_SECONDS = parseInt(process.env.ACCESS_TOKEN_EXPIRY_SECONDS || "30", 10);
const REFRESH_TOKEN_EXPIRY_SECONDS = parseInt(process.env.REFRESH_TOKEN_EXPIRY_SECONDS || "3600", 10);

const app = express();
const authApp = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
authApp.use(express.json());
authApp.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] RESOURCE SERVER: ${req.method} ${req.url}`);
  if (req.headers.authorization) {
    const token = req.headers.authorization.substring(7);
    const tokenData = accessTokens.get(token);
    if (tokenData) {
      const expiresIn = Math.max(0, Math.floor((tokenData.expires_at - Date.now()) / 1000));
      console.error(`[${timestamp}] RESOURCE SERVER: Token expires in ${expiresIn}s`);
    } else {
      console.error(`[${timestamp}] RESOURCE SERVER: Token not found or expired`);
    }
  }
  next();
});

authApp.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] AUTH SERVER: ${req.method} ${req.url}`);
  next();
});

// In-memory storage for OAuth state
const authCodes = new Map();
const accessTokens = new Map();
const refreshTokens = new Map();
const clients = new Map();

// Register a test client
const CLIENT_ID = "test-client-id";
const CLIENT_SECRET = "test-client-secret";
clients.set(CLIENT_ID, {
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  redirect_uris: [
    "cursor://anysphere.cursor-retrieval/oauth/user-hound/callback",
    "http://localhost:3010/callback",
  ],
  scopes: ["mcp.read"]
});

// ============================================================================
// AUTHORIZATION SERVER
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

// JWKS endpoint
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

// Dynamic Client Registration endpoint
authApp.post("/oauth/register", (req, res) => {
  const { redirect_uris, token_endpoint_auth_method, grant_types, response_types, client_name } = req.body;
  
  console.error("📝 CLIENT REGISTRATION REQUEST:");
  console.error(`   Client Name: ${client_name}`);
  console.error(`   Redirect URIs: ${JSON.stringify(redirect_uris)}`);
  console.error(`   Auth Method: ${token_endpoint_auth_method}`);
  
  const clientId = `cursor_${crypto.randomBytes(8).toString('hex')}`;
  const clientSecret = token_endpoint_auth_method === 'none' ? null : crypto.randomBytes(16).toString('hex');
  
  clients.set(clientId, {
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: redirect_uris || [],
    grant_types: grant_types || ["authorization_code"],
    response_types: response_types || ["code"],
    client_name: client_name || "Unknown Client",
    token_endpoint_auth_method: token_endpoint_auth_method || "client_secret_basic",
    scopes: ["mcp.read"]
  });
  
  console.error(`✅ Registered new client: ${clientId}`);
  
  const registrationResponse = {
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: redirect_uris,
    grant_types: grant_types,
    response_types: response_types,
    client_name: client_name,
    token_endpoint_auth_method: token_endpoint_auth_method
  };
  
  if (token_endpoint_auth_method === 'none') {
    delete registrationResponse.client_secret;
  }
  
  res.json(registrationResponse);
});

// Authorization endpoint
authApp.get("/oauth/authorize", (req, res) => {
  const { client_id, redirect_uri, response_type, scope, state, code_challenge, code_challenge_method } = req.query;
  
  console.error("Authorization request received:", { client_id, redirect_uri, response_type, scope, state });
  
  const client = clients.get(client_id);
  if (!client) {
    return res.status(400).json({ error: "invalid_client" });
  }
  
  if (!client.redirect_uris.includes(redirect_uri)) {
    return res.status(400).json({ error: "invalid_redirect_uri" });
  }
  
  const authCode = `tbac__${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
  console.error(`🔑 Generated auth code: ${authCode}`);
  authCodes.set(authCode, {
    client_id,
    redirect_uri,
    scope,
    code_challenge,
    code_challenge_method,
    expires_at: Date.now() + 600000 // 10 minutes
  });
  
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', authCode);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }
  
  console.error("Redirecting to:", redirectUrl.toString());
  res.redirect(redirectUrl.toString());
});

// Token endpoint - handles both authorization_code and refresh_token grants
authApp.post("/oauth/token", (req, res) => {
  const { grant_type, code, redirect_uri, client_id, client_secret, code_verifier, refresh_token } = req.body;
  
  console.error("Token request received:", { grant_type, code, redirect_uri, client_id, refresh_token: refresh_token ? "present" : "missing" });
  
  // Handle refresh token grant
  if (grant_type === "refresh_token") {
    if (!refresh_token) {
      return res.status(400).json({ error: "invalid_request", error_description: "refresh_token required" });
    }
    
    const refreshTokenData = refreshTokens.get(refresh_token);
    if (!refreshTokenData || refreshTokenData.expires_at < Date.now()) {
      refreshTokens.delete(refresh_token);
      console.error("❌ Refresh token invalid or expired");
      return res.status(400).json({ error: "invalid_grant", error_description: "Refresh token is invalid or expired" });
    }
    
    const client = clients.get(refreshTokenData.client_id);
    if (!client) {
      return res.status(401).json({ error: "invalid_client" });
    }
    
    // Validate client authentication
    if (client.token_endpoint_auth_method === 'none') {
      console.error("✅ Client uses 'none' auth method, no secret required");
    } else if (client.client_secret !== client_secret) {
      return res.status(401).json({ error: "invalid_client" });
    }
    
    // Generate new access token
    const newAccessToken = `mcp_${crypto.randomBytes(32).toString('hex')}`;
    const newRefreshToken = `ref_${crypto.randomBytes(32).toString('hex')}`;
    
    const expiresAt = Date.now() + (ACCESS_TOKEN_EXPIRY_SECONDS * 1000);
    accessTokens.set(newAccessToken, {
      client_id: refreshTokenData.client_id,
      scope: refreshTokenData.scope,
      expires_at: expiresAt
    });
    
    // Update refresh token (rotate it)
    refreshTokens.delete(refresh_token);
    refreshTokens.set(newRefreshToken, {
      client_id: refreshTokenData.client_id,
      scope: refreshTokenData.scope,
      expires_at: Date.now() + (REFRESH_TOKEN_EXPIRY_SECONDS * 1000)
    });
    
    console.error(`✅ Token refreshed: new access token expires in ${ACCESS_TOKEN_EXPIRY_SECONDS}s`);
    
    res.json({
      access_token: newAccessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
      refresh_token: newRefreshToken,
      scope: refreshTokenData.scope
    });
    return;
  }
  
  // Handle authorization code grant
  if (grant_type !== "authorization_code") {
    return res.status(400).json({ error: "unsupported_grant_type" });
  }
  
  const client = clients.get(client_id);
  if (!client) {
    return res.status(401).json({ error: "invalid_client" });
  }
  
  if (client.token_endpoint_auth_method === 'none') {
    console.error("✅ Client uses 'none' auth method, no secret required");
  } else if (client.client_secret !== client_secret) {
    return res.status(401).json({ error: "invalid_client" });
  }
  
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
  
  // Generate access token with short expiration
  const accessToken = `mcp_${crypto.randomBytes(32).toString('hex')}`;
  const refreshToken = `ref_${crypto.randomBytes(32).toString('hex')}`;
  
  const expiresAt = Date.now() + (ACCESS_TOKEN_EXPIRY_SECONDS * 1000);
  accessTokens.set(accessToken, {
    client_id,
    scope: authData.scope,
    expires_at: expiresAt
  });
  
  refreshTokens.set(refreshToken, {
    client_id,
    scope: authData.scope,
    expires_at: Date.now() + (REFRESH_TOKEN_EXPIRY_SECONDS * 1000)
  });
  
  // Clean up authorization code
  authCodes.delete(code);
  
  console.error(`✅ Issued access token expiring in ${ACCESS_TOKEN_EXPIRY_SECONDS}s`);
  
  res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
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
    console.error("❌ Userinfo request with expired/invalid token");
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
  
  if (!tokenData) {
    console.error("❌ Token not found in storage");
    res.set('WWW-Authenticate', `Bearer resource_metadata="${BASE_URL}/.well-known/oauth-protected-resource"`);
    return res.status(401).send('Unauthorized');
  }
  
  if (tokenData.expires_at < Date.now()) {
    const expiredSecondsAgo = Math.floor((Date.now() - tokenData.expires_at) / 1000);
    console.error(`❌ Token expired ${expiredSecondsAgo}s ago - client should refresh`);
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
    name: "oauth-token-refresh-server",
    version: "1.0.0",
    capabilities: {
      tools: {}
    }
  }
);

// Register a test tool that shows token expiration info
server.tool("token-info", "Returns information about the current access token expiration", async (params, context) => {
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
  
  if (!tokenData) {
    return {
      content: [{
        type: "text",
        text: "Token not found"
      }]
    };
  }
  
  const expiresIn = Math.max(0, Math.floor((tokenData.expires_at - Date.now()) / 1000));
  const isExpired = tokenData.expires_at < Date.now();
  
  return {
    content: [{
      type: "text",
      text: `Token Status: ${isExpired ? "EXPIRED" : "VALID"}\nExpires in: ${expiresIn} seconds\nAccess token expires after: ${ACCESS_TOKEN_EXPIRY_SECONDS} seconds`
    }]
  };
});

// Register a simple ping tool
server.tool("ping", "A simple tool that returns 'pong'", async (params) => {
  return {
    content: [{
      type: "text",
      text: "pong"
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
  console.error(`OAuth Authorization Server listening on port ${AUTH_SERVER_PORT}`);
  console.error(`Authorization Server URL: ${AUTH_SERVER_URL}`);
  console.error(`Discovery: ${AUTH_SERVER_URL}/.well-known/oauth-authorization-server`);
  console.error(`Access token expiration: ${ACCESS_TOKEN_EXPIRY_SECONDS} seconds`);
  console.error(`Refresh token expiration: ${REFRESH_TOKEN_EXPIRY_SECONDS} seconds`);
});

setupServer().then(() => {
  app.listen(PORT, () => {
    console.error(`OAuth Token Refresh Test MCP Server listening on port ${PORT}`);
    console.error(`Resource Server URL: ${BASE_URL}`);
    console.error(`MCP Endpoint: ${BASE_URL}/mcp`);
    console.error(`Resource Discovery: ${BASE_URL}/.well-known/oauth-protected-resource`);
    console.error("");
    console.error("This server tests OAuth token refresh behavior:");
    console.error(`- Access tokens expire after ${ACCESS_TOKEN_EXPIRY_SECONDS} seconds`);
    console.error("- When tokens expire, clients should automatically refresh using refresh_token");
    console.error("- Bug: Clients currently don't refresh automatically and require manual reconnection");
    console.error("");
    console.error("Test with:");
    console.error(`curl --head ${BASE_URL}/mcp`);
    console.error(`curl -s ${BASE_URL}/.well-known/oauth-protected-resource | jq`);
    console.error(`curl -s ${AUTH_SERVER_URL}/.well-known/oauth-authorization-server | jq`);
  });
}).catch(error => {
  console.error('Failed to set up the MCP server:', error);
  process.exit(1);
});
