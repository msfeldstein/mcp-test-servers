#!/usr/bin/env node

/*
OAuth flows dance,
Tokens whisper through the net,
Debug lights the way.
*/

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import crypto from "crypto";

const PORT = process.env.PORT || 3003;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const AUTH_SERVER_PORT = process.env.AUTH_SERVER_PORT || 3004;
const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || `http://localhost:${AUTH_SERVER_PORT}`;

// This server is specifically designed to debug OAuth discovery issues
// It provides extensive logging and tracks all endpoint access patterns

const app = express();
const authApp = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
authApp.use(express.json());
authApp.use(express.urlencoded({ extended: true }));

// Request tracking
const requestLog = [];
const maxLogEntries = 1000;
let latestClientAppVersion = null;

const CLIENT_APP_VERSION_HEADER_KEYS = [
  "x-client-app-version",
  "x-cursor-client-version",
  "x-cursor-version",
  "x-app-version",
  "cursor-client-version",
  "mcp-client-version",
];

function normalizeHeaderValue(value) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractClientAppVersion(headers = {}) {
  for (const headerKey of CLIENT_APP_VERSION_HEADER_KEYS) {
    const candidate = normalizeHeaderValue(headers[headerKey]);
    if (candidate) {
      return candidate;
    }
  }

  const userAgent = normalizeHeaderValue(headers["user-agent"]);
  if (!userAgent) {
    return null;
  }

  const cursorVersionMatch = userAgent.match(/cursor(?:\/|[\s-])([0-9][0-9A-Za-z.+-]*)/i);
  return cursorVersionMatch ? cursorVersionMatch[1] : null;
}

function logRequest(server, method, url, headers, body, timestamp = new Date()) {
  const appVersion = extractClientAppVersion(headers);
  const entry = {
    timestamp: timestamp.toISOString(),
    server,
    method,
    url,
    headers: { ...headers },
    body: body ? JSON.stringify(body) : null,
    userAgent: headers["user-agent"] || "unknown",
    appVersion,
  };

  if (appVersion) {
    latestClientAppVersion = appVersion;
  }
  
  requestLog.push(entry);
  if (requestLog.length > maxLogEntries) {
    requestLog.shift();
  }
  
  // Enhanced console logging with colors and context
  const serverLabel = server === 'auth' ? '🔐 AUTH' : '📦 RESOURCE';
  const methodColor = method === 'GET' ? '🔍' : method === 'POST' ? '📝' : '❓';
  console.log(`${serverLabel} ${methodColor} ${method} ${url}`);
  
  if (headers.authorization) {
    console.log(`   🎫 Auth: ${headers.authorization.substring(0, 20)}...`);
  }
  
  if (body && Object.keys(body).length > 0) {
    console.log(`   📄 Body: ${JSON.stringify(body)}`);
  }
}

// Enhanced logging middleware
app.use((req, res, next) => {
  logRequest('resource', req.method, req.url, req.headers, req.body);
  next();
});

authApp.use((req, res, next) => {
  logRequest('auth', req.method, req.url, req.headers, req.body);
  next();
});

// In-memory storage
const authCodes = new Map();
const accessTokens = new Map();
const clients = new Map();

// Register test client
const CLIENT_ID = "oauth-debug-client";
const CLIENT_SECRET = "oauth-debug-secret";
clients.set(CLIENT_ID, {
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  redirect_uris: [
    "cursor://anysphere.cursor-retrieval/oauth/user-hound/callback",
    "cursor-dev://anysphere.cursor-retrieval/oauth/user-oauther/callback", // From your logs
    "http://localhost:3003/callback",
  ],
  scopes: ["mcp.read", "mcp.write"]
});

// ============================================================================
// AUTHORIZATION SERVER
// ============================================================================

// OAuth Authorization Server Discovery Endpoint
authApp.get("/.well-known/oauth-authorization-server", (req, res) => {
  console.log("✅ DISCOVERY: OAuth authorization server metadata requested");
  const metadata = {
    issuer: AUTH_SERVER_URL,
    authorization_endpoint: `${AUTH_SERVER_URL}/oauth/authorize`,
    token_endpoint: `${AUTH_SERVER_URL}/oauth/token`,
    jwks_uri: `${AUTH_SERVER_URL}/.well-known/jwks.json`,
    registration_endpoint: `${AUTH_SERVER_URL}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    introspection_endpoint: `${AUTH_SERVER_URL}/oauth/introspect`,
    code_challenge_methods_supported: ["S256"],
    userinfo_endpoint: `${AUTH_SERVER_URL}/oauth/userinfo`,
    scopes_supported: ["mcp.read", "mcp.write"]
  };
  
  console.log("📋 Returning metadata:", JSON.stringify(metadata, null, 2));
  res.json(metadata);
});

// JWKS endpoint
authApp.get("/.well-known/jwks.json", (req, res) => {
  console.log("🔑 JWKS endpoint accessed");
  res.json({
    keys: [
      {
        kty: "RSA",
        kid: "debug-key-1",
        use: "sig",
        alg: "RS256",
        n: "debug-modulus-value",
        e: "AQAB"
      }
    ]
  });
});

// Dynamic Client Registration endpoint
authApp.post("/oauth/register", (req, res) => {
  const { redirect_uris, token_endpoint_auth_method, grant_types, response_types, client_name } = req.body;
  
  console.log("📝 CLIENT REGISTRATION REQUEST:");
  console.log(`   Client Name: ${client_name}`);
  console.log(`   Redirect URIs: ${JSON.stringify(redirect_uris)}`);
  console.log(`   Auth Method: ${token_endpoint_auth_method}`);
  console.log(`   Grant Types: ${JSON.stringify(grant_types)}`);
  console.log(`   Response Types: ${JSON.stringify(response_types)}`);
  
  // Generate a new client ID for this registration
  const clientId = `cursor_${crypto.randomBytes(8).toString('hex')}`;
  const clientSecret = token_endpoint_auth_method === 'none' ? null : crypto.randomBytes(16).toString('hex');
  
  // Store the client
  clients.set(clientId, {
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: redirect_uris || [],
    grant_types: grant_types || ["authorization_code"],
    response_types: response_types || ["code"],
    client_name: client_name || "Unknown Client",
    token_endpoint_auth_method: token_endpoint_auth_method || "client_secret_basic",
    scopes: ["mcp.read", "mcp.write"]
  });
  
  console.log(`✅ Registered new client: ${clientId}`);
  
  const registrationResponse = {
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: redirect_uris,
    grant_types: grant_types,
    response_types: response_types,
    client_name: client_name,
    token_endpoint_auth_method: token_endpoint_auth_method
  };
  
  // Don't include client_secret in response if auth method is 'none'
  if (token_endpoint_auth_method === 'none') {
    delete registrationResponse.client_secret;
  }
  
  console.log("📋 Registration response:", JSON.stringify(registrationResponse, null, 2));
  res.json(registrationResponse);
});

// Authorization endpoint
authApp.get("/oauth/authorize", (req, res) => {
  const { client_id, redirect_uri, response_type, scope, state, code_challenge, code_challenge_method } = req.query;
  
  console.log("🚀 AUTHORIZATION REQUEST:");
  console.log(`   Client ID: ${client_id}`);
  console.log(`   Redirect URI: ${redirect_uri}`);
  console.log(`   Response Type: ${response_type}`);
  console.log(`   Scope: ${scope}`);
  console.log(`   State: ${state}`);
  console.log(`   PKCE Challenge: ${code_challenge ? 'Present' : 'None'}`);
  
  const client = clients.get(client_id);
  if (!client) {
    console.log("❌ Invalid client ID");
    return res.status(400).json({ error: "invalid_client" });
  }
  
  if (!client.redirect_uris.includes(redirect_uri)) {
    console.log("❌ Invalid redirect URI");
    return res.status(400).json({ error: "invalid_redirect_uri" });
  }
  
  // Generate authorization code
  const authCode = `tbac__${crypto.randomBytes(20).toString('hex').toUpperCase()}`;
  console.log(`🎟️  Generated authorization code: ${authCode}`);
  
  authCodes.set(authCode, {
    client_id,
    redirect_uri,
    scope,
    code_challenge,
    code_challenge_method,
    expires_at: Date.now() + 600000
  });
  
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', authCode);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }
  
  console.log(`🔄 Redirecting to: ${redirectUrl.toString()}`);
  res.redirect(redirectUrl.toString());
});

// Token endpoint
authApp.post("/oauth/token", (req, res) => {
  const { grant_type, code, redirect_uri, client_id, client_secret, code_verifier } = req.body;
  
  console.log("💰 TOKEN REQUEST:");
  console.log(`   Grant Type: ${grant_type}`);
  console.log(`   Code: ${code}`);
  console.log(`   Client ID: ${client_id}`);
  console.log(`   Redirect URI: ${redirect_uri}`);
  console.log(`   PKCE Verifier: ${code_verifier ? 'Present' : 'None'}`);
  
  if (grant_type !== "authorization_code") {
    console.log("❌ Unsupported grant type");
    return res.status(400).json({ error: "unsupported_grant_type" });
  }
  
  const client = clients.get(client_id);
  if (!client) {
    console.log("❌ Invalid client ID");
    return res.status(401).json({ error: "invalid_client" });
  }
  
  // Check client authentication based on auth method
  if (client.token_endpoint_auth_method === 'none') {
    console.log("✅ Client uses 'none' auth method, no secret required");
  } else if (client.client_secret !== client_secret) {
    console.log("❌ Invalid client secret");
    return res.status(401).json({ error: "invalid_client" });
  }
  
  const authData = authCodes.get(code);
  if (!authData || authData.expires_at < Date.now()) {
    console.log("❌ Invalid or expired authorization code");
    authCodes.delete(code);
    return res.status(400).json({ error: "invalid_grant" });
  }
  
  if (authData.client_id !== client_id || authData.redirect_uri !== redirect_uri) {
    console.log("❌ Authorization code mismatch");
    return res.status(400).json({ error: "invalid_grant" });
  }
  
  // Validate PKCE if present
  if (authData.code_challenge) {
    if (!code_verifier) {
      console.log("❌ Missing PKCE verifier");
      return res.status(400).json({ error: "invalid_request", error_description: "code_verifier required" });
    }
    
    const hash = crypto.createHash('sha256').update(code_verifier).digest('base64url');
    if (hash !== authData.code_challenge) {
      console.log("❌ Invalid PKCE verifier");
      return res.status(400).json({ error: "invalid_grant", error_description: "invalid code_verifier" });
    }
  }
  
  const accessToken = `debug_${crypto.randomBytes(32).toString('hex')}`;
  const refreshToken = `refresh_${crypto.randomBytes(32).toString('hex')}`;
  
  console.log(`🎫 Generated access token: ${accessToken.substring(0, 20)}...`);
  
  accessTokens.set(accessToken, {
    client_id,
    scope: authData.scope,
    expires_at: Date.now() + 3600000
  });
  
  authCodes.delete(code);
  
  const tokenResponse = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: refreshToken,
    scope: authData.scope
  };
  
  console.log("✅ Token issued successfully");
  res.json(tokenResponse);
});

// Userinfo endpoint
authApp.get("/oauth/userinfo", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("❌ Missing or invalid authorization header in userinfo request");
    return res.status(401).json({ error: "invalid_token" });
  }
  
  const token = authHeader.substring(7);
  const tokenData = accessTokens.get(token);
  
  if (!tokenData || tokenData.expires_at < Date.now()) {
    console.log("❌ Invalid or expired token in userinfo request");
    return res.status(401).json({ error: "invalid_token" });
  }
  
  console.log("👤 Userinfo requested with valid token");
  res.json({
    sub: "debug-user-123",
    name: "OAuth Debug User",
    email: "debug@oauth-test.com"
  });
});

// ============================================================================
// RESOURCE SERVER
// ============================================================================

// OAuth Protected Resource Discovery Endpoint
app.get("/.well-known/oauth-protected-resource", (req, res) => {
  console.log("✅ DISCOVERY: OAuth protected resource metadata requested");
  const metadata = {
    resource: `${BASE_URL}/mcp`,
    authorization_servers: [AUTH_SERVER_URL],
    jwks_uri: `${AUTH_SERVER_URL}/.well-known/jwks.json`,
    scopes_supported: ["mcp.read", "mcp.write"]
  };
  
  console.log("📋 Returning resource metadata:", JSON.stringify(metadata, null, 2));
  res.json(metadata);
});

// ============================================================================
// BUG REPRODUCTION ENDPOINTS
// ============================================================================

// All the invalid endpoints that Cursor tries to access
const invalidEndpoints = [
  "/.well-known/oauth-protected-resource/mcp",
  "/.well-known/oauth-authorization-server/mcp",
  "/.well-known/oauth-authorization-server",
  "/.well-known/openid-configuration/mcp",
  "/mcp/.well-known/openid-configuration"
];

invalidEndpoints.forEach(endpoint => {
  app.get(endpoint, (req, res) => {
    console.log(`❌ BUG REPRODUCED: Invalid endpoint accessed: ${endpoint}`);
    console.log("   This indicates Cursor is not properly caching discovery metadata");
    res.status(404).json({
      error: "not_found",
      error_description: `Invalid endpoint: ${endpoint}`,
      debug_info: "This endpoint should not be accessed if OAuth discovery is working correctly"
    });
  });
});

// Invalid token endpoint on resource server
app.post("/token", (req, res) => {
  console.log("❌ BUG REPRODUCED: Token request sent to RESOURCE server instead of AUTH server");
  console.log("   Token endpoint should be:", `${AUTH_SERVER_URL}/oauth/token`);
  res.status(404).json({
    error: "not_found",
    error_description: "Token endpoint is on the authorization server",
    correct_endpoint: `${AUTH_SERVER_URL}/oauth/token`
  });
});

app.get("/token", (req, res) => {
  console.log("❌ BUG REPRODUCED: GET request to token endpoint (should be POST)");
  res.status(405).json({
    error: "method_not_allowed",
    error_description: "Token endpoint requires POST method"
  });
});

// ============================================================================
// DEBUG ENDPOINTS
// ============================================================================

// Debug endpoint to view request log
app.get("/debug/requests", (req, res) => {
  console.log("🔍 Debug request log accessed");
  res.json({
    app_version: latestClientAppVersion || "unknown",
    total_requests: requestLog.length,
    recent_requests: requestLog.slice(-50),
    summary: {
      auth_server_requests: requestLog.filter(r => r.server === 'auth').length,
      resource_server_requests: requestLog.filter(r => r.server === 'resource').length,
      invalid_endpoints_accessed: requestLog.filter(r => 
        invalidEndpoints.some(endpoint => r.url === endpoint) || r.url === '/token'
      ).length
    }
  });
});

// Debug endpoint to view OAuth state
app.get("/debug/oauth-state", (req, res) => {
  console.log("🔍 OAuth state debug accessed");
  res.json({
    active_auth_codes: authCodes.size,
    active_access_tokens: accessTokens.size,
    registered_clients: Array.from(clients.keys())
  });
});

// ============================================================================
// MCP SERVER SETUP
// ============================================================================

// MCP endpoint with authentication
app.all("/mcp*", (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("🚫 MCP request without authentication");
    res.set('WWW-Authenticate', `Bearer resource_metadata="${BASE_URL}/.well-known/oauth-protected-resource"`);
    return res.status(401).send('Unauthorized');
  }
  
  const token = authHeader.substring(7);
  const tokenData = accessTokens.get(token);
  
  if (!tokenData || tokenData.expires_at < Date.now()) {
    console.log("🚫 MCP request with invalid/expired token");
    res.set('WWW-Authenticate', `Bearer resource_metadata="${BASE_URL}/.well-known/oauth-protected-resource"`);
    return res.status(401).send('Unauthorized');
  }
  
  console.log("✅ MCP request authenticated successfully");
  req.tokenData = tokenData;
  next();
});

// Configure MCP Server
const server = new McpServer({
  name: "oauth-debug-server",
  version: "1.0.0",
  capabilities: {
    tools: {}
  }
});

// Debug tool
server.tool("debug-oauth", "Returns OAuth debugging information", async (params, context) => {
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
        text: "Invalid token"
      }]
    };
  }
  
  return {
    content: [{
      type: "text",
      text: `OAuth Debug Info:
- Client: ${tokenData.client_id}
- Scopes: ${tokenData.scope}
- Token expires: ${new Date(tokenData.expires_at).toISOString()}
- Recent requests: ${requestLog.slice(-5).length}
- Invalid endpoint hits: ${requestLog.filter(r => 
  invalidEndpoints.some(endpoint => r.url === endpoint) || r.url === '/token'
).length}`
    }]
  };
});

// Create HTTP transport
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});

// Setup MCP server
const setupServer = async () => {
  await server.connect(transport);
};

// MCP endpoint handler
app.post('/mcp', async (req, res) => {
  console.log('📨 MCP request received');
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('❌ Error handling MCP request:', error);
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

app.get('/mcp', (req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed. Use POST."
    },
    id: null
  });
});

// Start servers
authApp.listen(AUTH_SERVER_PORT, () => {
  console.log("🔐 OAuth Debug Authorization Server Started");
  console.log(`   URL: ${AUTH_SERVER_URL}`);
  console.log(`   Discovery: ${AUTH_SERVER_URL}/.well-known/oauth-authorization-server`);
  console.log("");
});

setupServer().then(() => {
  app.listen(PORT, () => {
    console.log("📦 OAuth Debug Resource Server Started");
    console.log(`   URL: ${BASE_URL}`);
    console.log(`   MCP Endpoint: ${BASE_URL}/mcp`);
    console.log(`   Resource Discovery: ${BASE_URL}/.well-known/oauth-protected-resource`);
    console.log("");
    console.log("🔍 Debug Endpoints:");
    console.log(`   Request Log: ${BASE_URL}/debug/requests`);
    console.log(`   OAuth State: ${BASE_URL}/debug/oauth-state`);
    console.log("");
    console.log("🎯 This server will detect and log OAuth discovery bugs");
    console.log("   Watch for ❌ BUG REPRODUCED messages in the console");
    console.log("");
  });
}).catch(error => {
  console.error('Failed to set up MCP server:', error);
  process.exit(1);
});
