#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import crypto from "crypto";

const PORT = process.env.PORT || 3008;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const AUTH_SERVER_PORT = process.env.AUTH_SERVER_PORT || 3009;
const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || `http://localhost:${AUTH_SERVER_PORT}`;

// This server attempts to replicate the EXACT conditions from the bug report
// to trigger the Cursor 1.4.x endpoint discovery issue

const app = express();
const authApp = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
authApp.use(express.json());
authApp.use(express.urlencoded({ extended: true }));

// Enhanced request tracking
const allRequests = [];
let callbackReceived = false;
let tokenExchangeCompleted = false;

function logRequest(server, method, url, headers = {}) {
  const timestamp = Date.now();
  const entry = {
    timestamp,
    server,
    method,
    url,
    timeSinceCallback: callbackReceived ? timestamp - callbackTime : null,
    timeSinceToken: tokenExchangeCompleted ? timestamp - tokenTime : null
  };
  
  allRequests.push(entry);
  
  const timeStr = new Date(timestamp).toTimeString().split(' ')[0];
  console.log(`[${timeStr}] ${server.toUpperCase()} ${method} ${url}`);
  
  // Check if this is one of the bug indicator endpoints
  const bugEndpoints = [
    '/.well-known/oauth-protected-resource/mcp',
    '/.well-known/oauth-authorization-server/mcp',
    '/.well-known/oauth-authorization-server',
    '/.well-known/openid-configuration/mcp',
    '/mcp/.well-known/openid-configuration',
    '/token'
  ];
  
  if (server === 'resource' && bugEndpoints.includes(url)) {
    console.log(`🚨 BUG REPRODUCED: Invalid endpoint ${url} accessed ${entry.timeSinceCallback}ms after callback!`);
    console.log(`   This is the Cursor 1.4.x OAuth discovery bug!`);
  }
}

app.use((req, res, next) => {
  logRequest('resource', req.method, req.url, req.headers);
  next();
});

authApp.use((req, res, next) => {
  logRequest('auth', req.method, req.url, req.headers);
  next();
});

// OAuth state
const authCodes = new Map();
const accessTokens = new Map();
const clients = new Map();

let callbackTime = 0;
let tokenTime = 0;

// ============================================================================
// AUTHORIZATION SERVER - EXACT BUG REPRODUCTION CONDITIONS
// ============================================================================

// Discovery with conditions that might trigger the bug
authApp.get("/.well-known/oauth-authorization-server", (req, res) => {
  console.log("🔍 DISCOVERY: Auth server metadata requested");
  
  // Use metadata structure similar to real-world servers
  const metadata = {
    issuer: AUTH_SERVER_URL,
    authorization_endpoint: `${AUTH_SERVER_URL}/oauth/authorize`,
    token_endpoint: `${AUTH_SERVER_URL}/oauth/token`,
    jwks_uri: `${AUTH_SERVER_URL}/.well-known/jwks.json`,
    userinfo_endpoint: `${AUTH_SERVER_URL}/oauth/userinfo`,
    registration_endpoint: `${AUTH_SERVER_URL}/oauth/register`,
    scopes_supported: ["openid", "mcp.read", "mcp.write"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_basic"],
    // Add some fields that might confuse endpoint parsing
    service_documentation: `${AUTH_SERVER_URL}/docs`,
    op_policy_uri: `${AUTH_SERVER_URL}/policy`,
    op_tos_uri: `${AUTH_SERVER_URL}/terms`
  };
  
  res.json(metadata);
});

// Client registration
authApp.post("/oauth/register", (req, res) => {
  const { redirect_uris, token_endpoint_auth_method, grant_types, response_types, client_name } = req.body;
  
  console.log("📝 CLIENT REGISTRATION:");
  console.log(`   Name: ${client_name}`);
  console.log(`   Redirect URIs: ${JSON.stringify(redirect_uris)}`);
  
  const clientId = `trigger_${crypto.randomBytes(8).toString('hex')}`;
  
  clients.set(clientId, {
    client_id: clientId,
    client_secret: null, // Use 'none' auth method
    redirect_uris: redirect_uris || [],
    token_endpoint_auth_method: 'none',
    grant_types: grant_types || ["authorization_code"],
    response_types: response_types || ["code"],
    client_name: client_name || "Bug Trigger Client"
  });
  
  console.log(`✅ Registered client: ${clientId}`);
  
  res.json({
    client_id: clientId,
    redirect_uris: redirect_uris,
    grant_types: grant_types,
    response_types: response_types,
    client_name: client_name,
    token_endpoint_auth_method: 'none'
  });
});

// Authorization endpoint
authApp.get("/oauth/authorize", (req, res) => {
  const { client_id, redirect_uri, response_type, scope, state, code_challenge, code_challenge_method } = req.query;
  
  console.log("🚀 AUTHORIZATION REQUEST:");
  console.log(`   Client: ${client_id}`);
  console.log(`   Redirect: ${redirect_uri}`);
  console.log(`   Scope: ${scope}`);
  
  const client = clients.get(client_id);
  if (!client) {
    return res.status(400).json({ error: "invalid_client" });
  }
  
  // Generate authorization code in the exact format from bug report
  const authCode = `tbac__${crypto.randomBytes(20).toString('hex').toUpperCase()}`;
  console.log(`🎟️  Generated auth code: ${authCode}`);
  
  authCodes.set(authCode, {
    client_id,
    redirect_uri,
    scope,
    code_challenge,
    code_challenge_method,
    expires_at: Date.now() + 600000
  });
  
  // Create redirect URL exactly like in bug report
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', authCode);
  redirectUrl.searchParams.set('state', state || ''); // Empty state like in bug report
  
  console.log(`🔄 Redirecting to: ${redirectUrl.toString()}`);
  console.log("🎯 CRITICAL: After this redirect, Cursor 1.4.x should lose endpoint tracking!");
  
  // Simulate the callback being received (since we can't actually intercept Cursor's callback)
  setTimeout(() => {
    callbackReceived = true;
    callbackTime = Date.now();
    console.log("📞 SIMULATING CALLBACK RECEIVED");
    console.log("🚨 Watch for invalid endpoint requests starting now!");
  }, 1000);
  
  res.redirect(redirectUrl.toString());
});

// Token endpoint
authApp.post("/oauth/token", (req, res) => {
  const { grant_type, code, redirect_uri, client_id, code_verifier } = req.body;
  
  console.log("💰 TOKEN REQUEST:");
  console.log(`   Grant Type: ${grant_type}`);
  console.log(`   Code: ${code}`);
  console.log(`   Client: ${client_id}`);
  
  if (grant_type !== "authorization_code") {
    return res.status(400).json({ error: "unsupported_grant_type" });
  }
  
  const client = clients.get(client_id);
  if (!client) {
    return res.status(401).json({ error: "invalid_client" });
  }
  
  const authData = authCodes.get(code);
  if (!authData || authData.expires_at < Date.now()) {
    authCodes.delete(code);
    return res.status(400).json({ error: "invalid_grant" });
  }
  
  // PKCE validation
  if (authData.code_challenge && code_verifier) {
    const hash = crypto.createHash('sha256').update(code_verifier).digest('base64url');
    if (hash !== authData.code_challenge) {
      return res.status(400).json({ error: "invalid_grant" });
    }
  }
  
  const accessToken = `trigger_${crypto.randomBytes(32).toString('hex')}`;
  
  accessTokens.set(accessToken, {
    client_id,
    scope: authData.scope,
    expires_at: Date.now() + 3600000
  });
  
  authCodes.delete(code);
  tokenExchangeCompleted = true;
  tokenTime = Date.now();
  
  console.log(`✅ Token issued: ${accessToken.substring(0, 20)}...`);
  console.log("🎯 Token exchange complete - bug should manifest soon if present!");
  
  res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    scope: authData.scope
  });
});

// ============================================================================
// RESOURCE SERVER - BUG DETECTION
// ============================================================================

// Correct resource discovery
app.get("/.well-known/oauth-protected-resource", (req, res) => {
  console.log("🔍 DISCOVERY: Resource metadata requested");
  
  const metadata = {
    resource: `${BASE_URL}/mcp`,
    authorization_servers: [AUTH_SERVER_URL],
    scopes_supported: ["mcp.read", "mcp.write"]
  };
  
  res.json(metadata);
});

// ============================================================================
// BUG DETECTION ENDPOINTS - The exact invalid endpoints from the bug report
// ============================================================================

// These are the 6 failed requests mentioned in the original bug report
const bugEndpoints = [
  {
    path: "/.well-known/oauth-protected-resource/mcp",
    description: "RS/.well-known/oauth-protected-resource/mcp"
  },
  {
    path: "/.well-known/oauth-authorization-server/mcp", 
    description: "RS/.well-known/oauth-authorization-server/mcp"
  },
  {
    path: "/.well-known/oauth-authorization-server",
    description: "RS/.well-known/oauth-authorization-server"
  },
  {
    path: "/.well-known/openid-configuration/mcp",
    description: "RS/.well-known/openid-configuration/mcp"
  },
  {
    path: "/mcp/.well-known/openid-configuration", 
    description: "RS/mcp/.well-known/openid-configuration"
  }
];

bugEndpoints.forEach(({ path, description }) => {
  app.get(path, (req, res) => {
    const timeSinceCallback = callbackReceived ? Date.now() - callbackTime : 'N/A';
    const timeSinceToken = tokenExchangeCompleted ? Date.now() - tokenTime : 'N/A';
    
    console.log(`🚨🚨🚨 BUG REPRODUCED! 🚨🚨🚨`);
    console.log(`   Invalid endpoint: ${description}`);
    console.log(`   Time since callback: ${timeSinceCallback}ms`);
    console.log(`   Time since token: ${timeSinceToken}ms`);
    console.log(`   This confirms the Cursor 1.4.x OAuth discovery bug!`);
    
    res.status(404).json({
      error: "cursor_1_4_x_bug_reproduced",
      error_description: `Invalid endpoint accessed: ${description}`,
      bug_details: {
        endpoint: path,
        time_since_callback: timeSinceCallback,
        time_since_token: timeSinceToken,
        description: "Cursor 1.4.x loses track of authorization server endpoints after OAuth callback"
      }
    });
  });
});

// The 6th invalid request: token endpoint on resource server
app.post("/token", (req, res) => {
  const timeSinceCallback = callbackReceived ? Date.now() - callbackTime : 'N/A';
  const timeSinceToken = tokenExchangeCompleted ? Date.now() - tokenTime : 'N/A';
  
  console.log(`🚨🚨🚨 BUG REPRODUCED! 🚨🚨🚨`);
  console.log(`   Invalid token request to RESOURCE server: RS/token`);
  console.log(`   Time since callback: ${timeSinceCallback}ms`);
  console.log(`   Time since token: ${timeSinceToken}ms`);
  console.log(`   Should be sent to: ${AUTH_SERVER_URL}/oauth/token`);
  
  res.status(404).json({
    error: "cursor_1_4_x_bug_reproduced",
    error_description: "Token request sent to resource server instead of authorization server",
    correct_endpoint: `${AUTH_SERVER_URL}/oauth/token`,
    bug_details: {
      time_since_callback: timeSinceCallback,
      time_since_token: timeSinceToken
    }
  });
});

// ============================================================================
// MCP SERVER SETUP
// ============================================================================

// MCP authentication
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
  
  console.log("✅ MCP request authenticated");
  req.tokenData = tokenData;
  next();
});

// MCP Server
const server = new McpServer({
  name: "oauth-bug-trigger-server",
  version: "1.0.0",
  capabilities: { tools: {} }
});

server.tool("bug-status", "Check if the OAuth bug has been reproduced", async () => {
  const bugRequests = allRequests.filter(r => 
    r.server === 'resource' && (
      r.url.includes('/.well-known/oauth-protected-resource/mcp') ||
      r.url.includes('/.well-known/oauth-authorization-server') ||
      r.url.includes('/.well-known/openid-configuration') ||
      r.url === '/token'
    )
  );
  
  return {
    content: [{
      type: "text",
      text: `Bug Status:
- Callback received: ${callbackReceived}
- Token exchange completed: ${tokenExchangeCompleted}
- Invalid endpoint requests: ${bugRequests.length}
- Bug reproduced: ${bugRequests.length > 0 ? 'YES! 🎯' : 'Not yet'}

${bugRequests.length > 0 ? 'Invalid requests detected:\n' + bugRequests.map(r => `- ${r.url} (${r.timeSinceCallback}ms after callback)`).join('\n') : ''}`
    }]
  };
});

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});

const setupServer = async () => {
  await server.connect(transport);
};

app.post('/mcp', async (req, res) => {
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('❌ MCP error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

app.get('/mcp', (req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed" },
    id: null
  });
});

// Debug endpoint
app.get('/debug/bug-trigger', (req, res) => {
  const bugRequests = allRequests.filter(r => 
    r.server === 'resource' && (
      r.url.includes('oauth-protected-resource/mcp') ||
      r.url.includes('oauth-authorization-server') ||
      r.url.includes('openid-configuration') ||
      r.url === '/token'
    )
  );
  
  res.json({
    status: {
      callback_received: callbackReceived,
      token_exchange_completed: tokenExchangeCompleted,
      bug_reproduced: bugRequests.length > 0
    },
    bug_requests: bugRequests,
    all_requests: allRequests.slice(-20), // Last 20 requests
    registered_clients: Array.from(clients.keys())
  });
});

// Start servers
authApp.listen(AUTH_SERVER_PORT, () => {
  console.log("🎯 OAuth Bug Trigger Authorization Server Started");
  console.log(`   URL: ${AUTH_SERVER_URL}`);
  console.log(`   This server is designed to reproduce the Cursor 1.4.x OAuth bug`);
});

setupServer().then(() => {
  app.listen(PORT, () => {
    console.log("🎯 OAuth Bug Trigger Resource Server Started");
    console.log(`   URL: ${BASE_URL}`);
    console.log(`   MCP: ${BASE_URL}/mcp`);
    console.log(`   Debug: ${BASE_URL}/debug/bug-trigger`);
    console.log("");
    console.log("🚨 BUG DETECTION ACTIVE");
    console.log("   Watching for these invalid requests after OAuth callback:");
    console.log("   1. /.well-known/oauth-protected-resource/mcp");
    console.log("   2. /.well-known/oauth-authorization-server/mcp");
    console.log("   3. /.well-known/oauth-authorization-server");
    console.log("   4. /.well-known/openid-configuration/mcp");
    console.log("   5. /mcp/.well-known/openid-configuration");
    console.log("   6. /token (POST to resource server)");
    console.log("");
    console.log("🎯 If any of these are accessed, the bug is reproduced!");
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

