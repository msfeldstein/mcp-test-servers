#!/usr/bin/env node

import express from "express";
import crypto from "crypto";

const PORT = process.env.PORT || 3005;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// This server specifically tests the OAuth callback scenario described in the bug report
// It simulates the exact sequence that causes Cursor to lose track of endpoints

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// State tracking
const callbackReceived = new Map();
const discoveryRequests = [];

// Enhanced request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    method: req.method,
    url: req.url,
    headers: { ...req.headers },
    query: { ...req.query },
    body: req.body,
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  discoveryRequests.push(logEntry);
  
  // Color-coded logging based on endpoint type
  let emoji = "📝";
  let status = "REQUEST";
  
  if (req.url.includes('well-known')) {
    emoji = "🔍";
    status = "DISCOVERY";
  } else if (req.url.includes('callback')) {
    emoji = "🔄";
    status = "CALLBACK";
  } else if (req.url.includes('token')) {
    emoji = "🎫";
    status = "TOKEN";
  }
  
  console.log(`[${timestamp}] ${emoji} ${status}: ${req.method} ${req.url}`);
  
  if (req.query && Object.keys(req.query).length > 0) {
    console.log(`   Query: ${JSON.stringify(req.query)}`);
  }
  
  next();
});

// ============================================================================
// OAUTH CALLBACK HANDLER (simulates Cursor's callback handling)
// ============================================================================

app.get("/oauth/user-hound/callback", (req, res) => {
  const { code, state } = req.query;
  
  console.log("🎯 CALLBACK RECEIVED - This is where the bug manifests!");
  console.log(`   Code: ${code}`);
  console.log(`   State: ${state}`);
  
  if (!code) {
    console.log("❌ No authorization code in callback");
    return res.status(400).send("Missing authorization code");
  }
  
  // Store callback info
  const callbackId = crypto.randomBytes(8).toString('hex');
  callbackReceived.set(callbackId, {
    code,
    state,
    timestamp: new Date().toISOString(),
    processed: false
  });
  
  console.log(`✅ Callback stored with ID: ${callbackId}`);
  console.log("🚨 CRITICAL: After this point, Cursor should use cached discovery info");
  console.log("   But instead it will make invalid requests to wrong endpoints");
  
  // Simulate successful callback processing
  res.send(`
    <html>
      <head><title>OAuth Callback Received</title></head>
      <body>
        <h1>OAuth Callback Test</h1>
        <p>Authorization code received: <code>${code}</code></p>
        <p>State: <code>${state || 'none'}</code></p>
        <p>Callback ID: <code>${callbackId}</code></p>
        <p><strong>Watch the server logs for invalid endpoint requests!</strong></p>
        <script>
          // Auto-close after 3 seconds if this is a popup
          setTimeout(() => {
            if (window.opener) {
              window.close();
            }
          }, 3000);
        </script>
      </body>
    </html>
  `);
});

// ============================================================================
// VALID DISCOVERY ENDPOINTS (what should be used)
// ============================================================================

app.get("/.well-known/oauth-protected-resource", (req, res) => {
  console.log("✅ CORRECT: OAuth protected resource discovery");
  res.json({
    resource: `${BASE_URL}/mcp`,
    authorization_servers: ["https://auth.example.com"],
    jwks_uri: "https://auth.example.com/.well-known/jwks.json",
    scopes_supported: ["mcp.read"]
  });
});

// This would normally be on the auth server, but we include it for testing
app.get("/.well-known/oauth-authorization-server", (req, res) => {
  console.log("✅ CORRECT: OAuth authorization server discovery (should be on auth server)");
  res.json({
    issuer: "https://auth.example.com",
    authorization_endpoint: "https://auth.example.com/oauth/authorize",
    token_endpoint: "https://auth.example.com/oauth/token",
    jwks_uri: "https://auth.example.com/.well-known/jwks.json",
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"]
  });
});

// ============================================================================
// INVALID ENDPOINTS (bug reproduction)
// ============================================================================

// These are the exact endpoints that Cursor incorrectly tries to access
const buggyEndpoints = [
  {
    path: "/.well-known/oauth-protected-resource/mcp",
    description: "Invalid: appending /mcp to protected resource endpoint"
  },
  {
    path: "/.well-known/oauth-authorization-server/mcp", 
    description: "Invalid: appending /mcp to authorization server endpoint"
  },
  {
    path: "/.well-known/openid-configuration/mcp",
    description: "Invalid: appending /mcp to OpenID configuration endpoint"
  },
  {
    path: "/mcp/.well-known/openid-configuration",
    description: "Invalid: prepending /mcp to OpenID configuration endpoint"
  }
];

buggyEndpoints.forEach(({ path, description }) => {
  app.get(path, (req, res) => {
    console.log(`❌ BUG REPRODUCED: ${description}`);
    console.log(`   Endpoint: ${path}`);
    console.log("   This indicates Cursor lost track of proper discovery endpoints");
    
    res.status(404).json({
      error: "endpoint_not_found",
      error_description: description,
      bug_info: {
        issue: "Cursor 1.4.x OAuth discovery bug",
        expected_behavior: "Should use cached discovery metadata from initial requests",
        actual_behavior: "Making invalid requests with incorrect path construction"
      }
    });
  });
});

// Invalid token endpoint (should be on auth server)
app.post("/token", (req, res) => {
  console.log("❌ BUG REPRODUCED: Token request to resource server");
  console.log("   This should go to the authorization server's /oauth/token endpoint");
  console.log("   Request body:", JSON.stringify(req.body, null, 2));
  
  res.status(404).json({
    error: "wrong_server",
    error_description: "Token endpoint is on the authorization server, not resource server",
    correct_endpoint: "https://auth.example.com/oauth/token",
    received_request: req.body
  });
});

app.get("/token", (req, res) => {
  console.log("❌ BUG REPRODUCED: GET request to token endpoint");
  console.log("   Token requests should be POST to authorization server");
  
  res.status(405).json({
    error: "method_not_allowed",
    error_description: "Token endpoint requires POST method on authorization server"
  });
});

// ============================================================================
// DEBUG AND TESTING ENDPOINTS
// ============================================================================

app.get("/debug/callback-status", (req, res) => {
  console.log("🔍 Callback status requested");
  
  const callbacks = Array.from(callbackReceived.entries()).map(([id, data]) => ({
    id,
    ...data
  }));
  
  res.json({
    total_callbacks: callbackReceived.size,
    callbacks,
    recent_requests: discoveryRequests.slice(-20),
    bug_indicators: {
      invalid_endpoint_requests: discoveryRequests.filter(req => 
        buggyEndpoints.some(endpoint => req.url === endpoint.path) || req.url === '/token'
      ).length,
      valid_discovery_requests: discoveryRequests.filter(req => 
        req.url === '/.well-known/oauth-protected-resource' || 
        req.url === '/.well-known/oauth-authorization-server'
      ).length
    }
  });
});

app.get("/debug/simulate-callback", (req, res) => {
  const testCode = `tbac__${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
  const testState = crypto.randomBytes(8).toString('hex');
  
  console.log("🧪 Simulating OAuth callback for testing");
  
  const callbackUrl = `${BASE_URL}/oauth/user-hound/callback?code=${testCode}&state=${testState}`;
  
  res.send(`
    <html>
      <head><title>OAuth Callback Simulator</title></head>
      <body>
        <h1>OAuth Callback Test Simulator</h1>
        <p>This simulates the OAuth callback that triggers the bug.</p>
        <p><a href="${callbackUrl}" target="_blank">Click here to simulate callback</a></p>
        <p>Or use this URL directly:</p>
        <code>${callbackUrl}</code>
        <p><strong>After clicking, watch the server console for bug reproduction!</strong></p>
      </body>
    </html>
  `);
});

// Test endpoint to trigger the bug sequence
app.post("/debug/trigger-bug-sequence", (req, res) => {
  console.log("🎯 TRIGGERING BUG SEQUENCE SIMULATION");
  console.log("This simulates what happens after OAuth callback in Cursor 1.4.x");
  
  // Simulate the sequence of invalid requests
  const invalidRequests = [
    "/.well-known/oauth-protected-resource/mcp",
    "/.well-known/oauth-authorization-server/mcp",
    "/.well-known/oauth-authorization-server",
    "/.well-known/openid-configuration/mcp", 
    "/mcp/.well-known/openid-configuration",
    "/token"
  ];
  
  console.log("🚨 Simulating the exact sequence of invalid requests:");
  invalidRequests.forEach((endpoint, index) => {
    setTimeout(() => {
      console.log(`${index + 1}. Would request: ${BASE_URL}${endpoint}`);
    }, index * 100);
  });
  
  res.json({
    message: "Bug sequence simulation triggered",
    invalid_requests: invalidRequests,
    note: "Check console logs for the sequence"
  });
});

// Root endpoint with instructions
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head><title>OAuth Callback Test Server</title></head>
      <body>
        <h1>OAuth Callback Bug Reproduction Server</h1>
        <p>This server reproduces the Cursor 1.4.x OAuth callback bug.</p>
        
        <h2>Test Endpoints:</h2>
        <ul>
          <li><a href="/debug/simulate-callback">Simulate OAuth Callback</a></li>
          <li><a href="/debug/callback-status">View Callback Status</a></li>
          <li><a href="/.well-known/oauth-protected-resource">OAuth Protected Resource Discovery</a></li>
          <li><a href="/.well-known/oauth-authorization-server">OAuth Authorization Server Discovery</a></li>
        </ul>
        
        <h2>How to Reproduce the Bug:</h2>
        <ol>
          <li>Configure Cursor to use this server as an MCP resource</li>
          <li>Start OAuth flow (Cursor will make initial discovery requests)</li>
          <li>Complete OAuth authorization (callback will be received here)</li>
          <li>Watch console logs for invalid endpoint requests</li>
        </ol>
        
        <h2>Expected Bug Behavior:</h2>
        <p>After OAuth callback, Cursor should make requests to:</p>
        <ul>
          <li>❌ <code>/.well-known/oauth-protected-resource/mcp</code></li>
          <li>❌ <code>/.well-known/oauth-authorization-server/mcp</code></li>
          <li>❌ <code>/.well-known/oauth-authorization-server</code> (on resource server)</li>
          <li>❌ <code>/.well-known/openid-configuration/mcp</code></li>
          <li>❌ <code>/mcp/.well-known/openid-configuration</code></li>
          <li>❌ <code>/token</code> (on resource server)</li>
        </ul>
        
        <p>Instead of using the correct cached discovery information.</p>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log("🧪 OAuth Callback Test Server Started");
  console.log(`   URL: ${BASE_URL}`);
  console.log(`   Callback URL: ${BASE_URL}/oauth/user-hound/callback`);
  console.log("");
  console.log("🎯 This server reproduces the exact OAuth callback bug from Cursor 1.4.x");
  console.log("   It will log ❌ BUG REPRODUCED when invalid endpoints are accessed");
  console.log("");
  console.log("🔗 Test URLs:");
  console.log(`   Main page: ${BASE_URL}/`);
  console.log(`   Simulate callback: ${BASE_URL}/debug/simulate-callback`);
  console.log(`   Debug status: ${BASE_URL}/debug/callback-status`);
  console.log("");
});
