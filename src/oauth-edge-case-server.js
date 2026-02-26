#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import crypto from "crypto";

const PORT = process.env.PORT || 3006;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const AUTH_SERVER_PORT = process.env.AUTH_SERVER_PORT || 3007;
const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || `http://localhost:${AUTH_SERVER_PORT}`;

// This server attempts to reproduce edge cases that might trigger the Cursor 1.4.x bug
// It introduces various conditions that might cause endpoint discovery issues

const app = express();
const authApp = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
authApp.use(express.json());
authApp.use(express.urlencoded({ extended: true }));

// Enhanced logging with timing
const requestLog = [];
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

function logWithTiming(server, method, url, headers = {}, extraInfo = "") {
  const timestamp = new Date();
  const appVersion = extractClientAppVersion(headers);
  const entry = {
    timestamp: timestamp.toISOString(),
    server,
    method,
    url,
    appVersion,
    extraInfo,
  };
  requestLog.push(entry);

  if (appVersion) {
    latestClientAppVersion = appVersion;
  }
  
  const timeStr = timestamp.toTimeString().split(' ')[0];
  console.log(`[${timeStr}] ${server.toUpperCase()} ${method} ${url} ${extraInfo}`);
}

app.use((req, res, next) => {
  logWithTiming('resource', req.method, req.url, req.headers);
  next();
});

authApp.use((req, res, next) => {
  logWithTiming('auth', req.method, req.url, req.headers);
  next();
});

// Storage
const authCodes = new Map();
const accessTokens = new Map();
const clients = new Map();

// ============================================================================
// EDGE CASE CONDITIONS THAT MIGHT TRIGGER THE BUG
// ============================================================================

// Edge Case 1: Slow response times (network delays)
const RESPONSE_DELAY = parseInt(process.env.RESPONSE_DELAY) || 0;

function addDelay(res, next) {
  if (RESPONSE_DELAY > 0) {
    console.log(`⏱️  Adding ${RESPONSE_DELAY}ms delay to simulate network latency`);
    setTimeout(next, RESPONSE_DELAY);
  } else {
    next();
  }
}

// Edge Case 2: Multiple authorization servers
const MULTIPLE_AUTH_SERVERS = process.env.MULTIPLE_AUTH_SERVERS === 'true';

// Edge Case 3: Discovery endpoint variations
const DISCOVERY_VARIANT = process.env.DISCOVERY_VARIANT || 'standard';

// ============================================================================
// AUTHORIZATION SERVER WITH EDGE CASES
// ============================================================================

// OAuth Authorization Server Discovery with potential edge cases
authApp.get("/.well-known/oauth-authorization-server", (req, res) => {
  addDelay(res, () => {
    console.log("🔍 DISCOVERY: Authorization server metadata (with edge cases)");
    
    let metadata = {
      issuer: AUTH_SERVER_URL,
      authorization_endpoint: `${AUTH_SERVER_URL}/oauth/authorize`,
      token_endpoint: `${AUTH_SERVER_URL}/oauth/token`,
      jwks_uri: `${AUTH_SERVER_URL}/.well-known/jwks.json`,
      registration_endpoint: `${AUTH_SERVER_URL}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: ["mcp.read", "mcp.write"]
    };
    
    // Edge Case: Add extra/unusual fields that might confuse clients
    if (DISCOVERY_VARIANT === 'extra-fields') {
      metadata = {
        ...metadata,
        custom_field: "custom_value",
        mcp_specific_endpoint: `${AUTH_SERVER_URL}/mcp/oauth`,
        alternative_token_endpoint: `${AUTH_SERVER_URL}/token`, // Potentially confusing
        service_documentation: "https://docs.example.com/oauth"
      };
      console.log("🧪 Adding extra fields to discovery metadata");
    }
    
    // Edge Case: Minimal response
    if (DISCOVERY_VARIANT === 'minimal') {
      metadata = {
        issuer: AUTH_SERVER_URL,
        authorization_endpoint: `${AUTH_SERVER_URL}/oauth/authorize`,
        token_endpoint: `${AUTH_SERVER_URL}/oauth/token`
      };
      console.log("🧪 Using minimal discovery metadata");
    }
    
    console.log("📋 Discovery metadata:", JSON.stringify(metadata, null, 2));
    res.json(metadata);
  });
});

// Client registration with edge cases
authApp.post("/oauth/register", (req, res) => {
  addDelay(res, () => {
    const { redirect_uris, token_endpoint_auth_method, grant_types, response_types, client_name } = req.body;
    
    console.log("📝 CLIENT REGISTRATION (edge case server):");
    console.log(`   Client: ${client_name}`);
    console.log(`   Redirect URIs: ${JSON.stringify(redirect_uris)}`);
    
    const clientId = `edge_${crypto.randomBytes(8).toString('hex')}`;
    const clientSecret = token_endpoint_auth_method === 'none' ? null : crypto.randomBytes(16).toString('hex');
    
    clients.set(clientId, {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris: redirect_uris || [],
      grant_types: grant_types || ["authorization_code"],
      response_types: response_types || ["code"],
      client_name: client_name || "Unknown Client",
      token_endpoint_auth_method: token_endpoint_auth_method || "none",
      scopes: ["mcp.read", "mcp.write"]
    });
    
    console.log(`✅ Registered edge case client: ${clientId}`);
    
    const response = {
      client_id: clientId,
      redirect_uris: redirect_uris,
      grant_types: grant_types,
      response_types: response_types,
      client_name: client_name,
      token_endpoint_auth_method: token_endpoint_auth_method
    };
    
    if (token_endpoint_auth_method !== 'none') {
      response.client_secret = clientSecret;
    }
    
    res.json(response);
  });
});

// Authorization endpoint with potential callback issues
authApp.get("/oauth/authorize", (req, res) => {
  const { client_id, redirect_uri, response_type, scope, state, code_challenge, code_challenge_method } = req.query;
  
  console.log("🚀 AUTHORIZATION REQUEST (edge case conditions):");
  console.log(`   Client: ${client_id}`);
  console.log(`   Redirect: ${redirect_uri}`);
  console.log(`   Scope: ${scope}`);
  console.log(`   PKCE Challenge: ${code_challenge}`);
  console.log(`   PKCE Method: ${code_challenge_method}`);
  
  console.log("🔍 Client lookup:");
  console.log(`   Requested client_id: ${client_id}`);
  console.log(`   Registered clients: ${Array.from(clients.keys()).join(', ')}`);
  
  const client = clients.get(client_id);
  if (!client) {
    console.log("❌ Invalid client - not found in registered clients");
    console.log("🚨 This might indicate Cursor is confused about which auth server to use!");
    console.log("   Possible causes:");
    console.log("   1. Cursor registered with a different server");
    console.log("   2. Cursor is trying the backup/non-existent auth server");
    console.log("   3. Client registration was lost");
    return res.status(400).json({ error: "invalid_client" });
  }
  
  if (!client.redirect_uris.includes(redirect_uri)) {
    console.log("❌ Invalid redirect URI");
    return res.status(400).json({ error: "invalid_redirect_uri" });
  }
  
  // Generate auth code with specific format that might trigger issues
  const authCode = `tbac__${crypto.randomBytes(20).toString('hex').toUpperCase()}`;
  console.log(`🎟️  Generated auth code: ${authCode}`);
  
  authCodes.set(authCode, {
    client_id,
    redirect_uri,
    scope,
    code_challenge,
    code_challenge_method,
    expires_at: Date.now() + 600000,
    timestamp: Date.now() // Track when code was issued
  });
  
  // Edge Case: Add delay before redirect to simulate slow authorization server
  const redirectDelay = parseInt(process.env.REDIRECT_DELAY) || 0;
  
  const doRedirect = () => {
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', authCode);
    if (state) {
      redirectUrl.searchParams.set('state', state);
    }
    
    console.log(`🔄 Redirecting to: ${redirectUrl.toString()}`);
    console.log("🚨 CRITICAL POINT: After this redirect, watch for invalid endpoint requests!");
    
    res.redirect(redirectUrl.toString());
  };
  
  if (redirectDelay > 0) {
    console.log(`⏱️  Adding ${redirectDelay}ms delay before redirect`);
    setTimeout(doRedirect, redirectDelay);
  } else {
    doRedirect();
  }
});

// Token endpoint with edge case handling
authApp.post("/oauth/token", (req, res) => {
  const { grant_type, code, redirect_uri, client_id, client_secret, code_verifier } = req.body;
  
  console.log("💰 TOKEN REQUEST (edge case server):");
  console.log(`   Code: ${code}`);
  console.log(`   Client: ${client_id}`);
  
  addDelay(res, () => {
    if (grant_type !== "authorization_code") {
      return res.status(400).json({ error: "unsupported_grant_type" });
    }
    
    const client = clients.get(client_id);
    if (!client) {
      console.log("❌ Invalid client");
      return res.status(401).json({ error: "invalid_client" });
    }
    
    if (client.token_endpoint_auth_method !== 'none' && client.client_secret !== client_secret) {
      console.log("❌ Invalid client secret");
      return res.status(401).json({ error: "invalid_client" });
    }
    
    const authData = authCodes.get(code);
    if (!authData || authData.expires_at < Date.now()) {
      console.log("❌ Invalid/expired code");
      authCodes.delete(code);
      return res.status(400).json({ error: "invalid_grant" });
    }
    
    // PKCE validation
    console.log("🔐 PKCE Debug:");
    console.log(`   Code challenge in auth data: ${authData.code_challenge}`);
    console.log(`   Code verifier received: ${code_verifier}`);
    console.log(`   Challenge method: ${authData.code_challenge_method}`);
    
    if (authData.code_challenge && code_verifier) {
      const hash = crypto.createHash('sha256').update(code_verifier).digest('base64url');
      console.log(`   Computed hash: ${hash}`);
      console.log(`   Expected hash: ${authData.code_challenge}`);
      
      if (hash !== authData.code_challenge) {
        console.log("❌ PKCE validation failed - hashes don't match");
        console.log("🚨 This might indicate Cursor is confused about which auth server to use!");
        return res.status(400).json({ error: "invalid_grant" });
      } else {
        console.log("✅ PKCE validation successful");
      }
    } else if (authData.code_challenge && !code_verifier) {
      console.log("❌ PKCE validation failed - code_verifier missing");
      return res.status(400).json({ error: "invalid_request", error_description: "code_verifier required" });
    } else {
      console.log("ℹ️  No PKCE validation required");
    }
    
    const accessToken = `edge_${crypto.randomBytes(32).toString('hex')}`;
    
    accessTokens.set(accessToken, {
      client_id,
      scope: authData.scope,
      expires_at: Date.now() + 3600000,
      issued_at: Date.now()
    });
    
    authCodes.delete(code);
    
    console.log(`✅ Token issued: ${accessToken.substring(0, 20)}...`);
    
    res.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      scope: authData.scope
    });
  });
});

// ============================================================================
// RESOURCE SERVER WITH EDGE CASES
// ============================================================================

// Protected resource discovery with edge cases
app.get("/.well-known/oauth-protected-resource", (req, res) => {
  addDelay(res, () => {
    console.log("🔍 DISCOVERY: Protected resource metadata (with edge cases)");
    
    let metadata = {
      resource: `${BASE_URL}/mcp`,
      authorization_servers: [AUTH_SERVER_URL],
      scopes_supported: ["mcp.read", "mcp.write"]
    };
    
    // Edge Case: Multiple authorization servers
    if (MULTIPLE_AUTH_SERVERS) {
      metadata.authorization_servers = [
        AUTH_SERVER_URL,
        "https://backup-auth.example.com", // Non-existent backup server
      ];
      console.log("🧪 Including multiple authorization servers");
    }
    
    // Edge Case: Extra metadata fields
    if (DISCOVERY_VARIANT === 'extra-fields') {
      metadata = {
        ...metadata,
        resource_documentation: "https://docs.example.com/mcp",
        mcp_version: "2025-06-18",
        custom_auth_info: {
          preferred_server: AUTH_SERVER_URL,
          fallback_available: true
        }
      };
      console.log("🧪 Adding extra resource metadata");
    }
    
    console.log("📋 Resource metadata:", JSON.stringify(metadata, null, 2));
    res.json(metadata);
  });
});

// All the invalid endpoints for bug detection
const invalidEndpoints = [
  "/.well-known/oauth-protected-resource/mcp",
  "/.well-known/oauth-authorization-server/mcp",
  "/.well-known/oauth-authorization-server",
  "/.well-known/openid-configuration/mcp",
  "/mcp/.well-known/openid-configuration"
];

invalidEndpoints.forEach(endpoint => {
  app.get(endpoint, (req, res) => {
    console.log(`🚨 BUG DETECTED: Invalid endpoint accessed: ${endpoint}`);
    console.log(`   Time since last token request: ${Date.now() - (requestLog[requestLog.length-1]?.timestamp || 0)}ms`);
    console.log("   This indicates the Cursor 1.4.x endpoint discovery bug!");
    
    res.status(404).json({
      error: "invalid_endpoint",
      error_description: `Cursor 1.4.x bug detected: ${endpoint}`,
      debug_info: {
        bug_reproduced: true,
        endpoint: endpoint,
        expected_behavior: "Should use cached discovery information",
        cursor_version_affected: "1.4.x"
      }
    });
  });
});

// Invalid token endpoint
app.post("/token", (req, res) => {
  console.log("🚨 BUG DETECTED: Token request to resource server!");
  console.log("   Should be sent to:", `${AUTH_SERVER_URL}/oauth/token`);
  
  res.status(404).json({
    error: "wrong_server",
    error_description: "Token endpoint is on authorization server",
    correct_endpoint: `${AUTH_SERVER_URL}/oauth/token`
  });
});

// MCP endpoint with authentication
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

// MCP Server setup
const server = new McpServer({
  name: "oauth-edge-case-server",
  version: "1.0.0",
  capabilities: { tools: {} }
});

server.tool("test-edge-cases", "Test tool for edge case scenarios", async (params, context) => {
  return {
    content: [{
      type: "text",
      text: `Edge case server active. Request log: ${requestLog.length} entries. Invalid endpoints accessed: ${requestLog.filter(r => invalidEndpoints.includes(r.url) || r.url === '/token').length}`
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
app.get('/debug/edge-cases', (req, res) => {
  res.json({
    config: {
      response_delay: RESPONSE_DELAY,
      multiple_auth_servers: MULTIPLE_AUTH_SERVERS,
      discovery_variant: DISCOVERY_VARIANT
    },
    oauth_state: {
      registered_clients: Array.from(clients.keys()),
      active_auth_codes: authCodes.size,
      active_access_tokens: accessTokens.size
    },
    stats: {
      app_version: latestClientAppVersion || "unknown",
      total_requests: requestLog.length,
      invalid_endpoint_hits: requestLog.filter(r => 
        invalidEndpoints.includes(r.url) || r.url === '/token'
      ).length,
      recent_requests: requestLog.slice(-10)
    }
  });
});

// Start servers
authApp.listen(AUTH_SERVER_PORT, () => {
  console.log("🧪 OAuth Edge Case Authorization Server Started");
  console.log(`   URL: ${AUTH_SERVER_URL}`);
  console.log(`   Config: delay=${RESPONSE_DELAY}ms, variant=${DISCOVERY_VARIANT}`);
});

setupServer().then(() => {
  app.listen(PORT, () => {
    console.log("🧪 OAuth Edge Case Resource Server Started");
    console.log(`   URL: ${BASE_URL}`);
    console.log(`   MCP: ${BASE_URL}/mcp`);
    console.log(`   Debug: ${BASE_URL}/debug/edge-cases`);
    console.log("");
    console.log("🎯 Edge Case Testing Modes:");
    console.log("   RESPONSE_DELAY=1000 - Add network latency");
    console.log("   DISCOVERY_VARIANT=extra-fields - Add confusing metadata");
    console.log("   MULTIPLE_AUTH_SERVERS=true - Multiple auth servers");
    console.log("");
    console.log("🚨 Watch for BUG DETECTED messages after OAuth callback!");
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
